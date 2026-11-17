import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { parse as csvParse } from 'fast-csv';
import { PrismaService } from '../../prisma/prisma.service';
import * as XLSX from 'xlsx';

type ImportRow = {
  date: string;
  description: string;
  category?: string;
  amount: string | number;
  type?: string;
};

function parseBRNumber(input: string): number {
  // accepts: "-29,90", "1.234,56", "1234.56", "1234,56"
  const s = String(input).trim();
  if (!s) return NaN;

  // if it contains both '.' and ',', assume '.' thousands and ',' decimals
  if (s.includes('.') && s.includes(',')) {
    const n = s.replace(/\./g, '').replace(',', '.');
    return Number(n);
  }

  // if it contains comma as decimal separator, remove thousand dots
  if (s.includes(',') && !s.includes('.')) {
    const n = s.replace(/\./g, '').replace(',', '.');
    return Number(n);
  }

  return Number(s);
}

function parseDateFlexible(input: string): Date {
  const s = String(input).trim();
  if (!s) throw new BadRequestException('missing date');

  // Excel serial date
  if (/^\d+(\.\d+)?$/.test(s) && Number(s) > 20000 && Number(s) < 80000) {
    const d = XLSX.SSF.parse_date_code(Number(s));
    if (d) return new Date(d.y, d.m - 1, d.d, 12, 0, 0); // noon to avoid timezone issues
  }

  // DD/MM/YYYY
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [_, dd, mm, yyyy] = m;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), 12, 0, 0); // noon to avoid timezone issues
    if (Number.isNaN(d.getTime())) throw new BadRequestException('invalid date');
    return d;
  }

  // YYYY-MM-DD or ISO
  const d = new Date(s + 'T12:00:00'); // add noon time to avoid timezone issues
  if (Number.isNaN(d.getTime())) throw new BadRequestException('invalid date');
  return d;
}

function normHeader(h: string) {
  return h.toLowerCase().trim();
}

@Injectable()
export class ImportExportService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureCategory(userId: string, name: string | undefined): Promise<string | null> {
    const n = (name || '').trim();
    if (!n) return null;

    const existing = await this.prisma.category.findFirst({ where: { userId, name: n } });
    if (existing) return existing.id;

    const created = await this.prisma.category.create({ data: { userId, name: n } });
    return created.id;
  }

  async previewCSV(userId: string, accountId: string, buffer: Buffer) {
    const rows: ImportRow[] = [];

    await new Promise<void>((resolve, reject) => {
      const stream = csvParse({ headers: true, ignoreEmpty: true, trim: true })
        .on('error', reject)
        .on('data', (r: Record<string, any>) => {
          const map: Record<string, any> = {};
          for (const [k, v] of Object.entries(r)) map[normHeader(k)] = v;

          const date = map['data'] ?? map['date'] ?? map['data ocorrência'] ?? map['data ocorrencia'];
          const description = map['descrição'] ?? map['descricao'] ?? map['description'];
          const category = map['categoria'] ?? map['category'];
          const amount = map['valor'] ?? map['amount'];
          const type = map['tipo'] ?? map['type'];

          // Skip empty rows
          if (!date && !description && !amount) return;

          rows.push({
            date: String(date ?? ''),
            description: String(description ?? ''),
            category: category ? String(category) : undefined,
            amount: amount ?? '',
            type: type ? String(type) : undefined,
          });
        })
        .on('end', () => resolve());

      stream.write(buffer);
      stream.end();
    });

    return this.previewRows(userId, accountId, rows);
  }

  async previewExcel(userId: string, accountId: string, buffer: Buffer) {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    if (!ws) throw new BadRequestException('No worksheet');

    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' }) as any[][];
    if (!aoa.length) throw new BadRequestException('Empty worksheet');

    const header = (aoa[0] || []).map((h) => normHeader(String(h ?? '')));
    const rows: ImportRow[] = [];

    for (let i = 1; i < aoa.length; i++) {
      const line = aoa[i] || [];
      const rec: Record<string, any> = {};
      for (let c = 0; c < header.length; c++) {
        const key = header[c];
        if (!key) continue;
        rec[key] = line[c];
      }

      const date = rec['data'] ?? rec['date'] ?? rec['data ocorrência'] ?? rec['data ocorrencia'];
      const description = rec['descrição'] ?? rec['descricao'] ?? rec['description'];
      const category = rec['categoria'] ?? rec['category'];
      const amount = rec['valor'] ?? rec['amount'];
      const type = rec['tipo'] ?? rec['type'];

      // Skip empty rows
      if (!date && !description && !amount) continue;

      rows.push({
        date: String(date ?? ''),
        description: String(description ?? ''),
        category: category ? String(category) : undefined,
        amount: amount ?? '',
        type: type ? String(type) : undefined,
      });
    }

    return this.previewRows(userId, accountId, rows);
  }

  private async previewRows(userId: string, accountId: string, rows: ImportRow[]) {
    if (!accountId) throw new BadRequestException('accountId is required');
    const account = await this.prisma.account.findFirst({ where: { id: accountId, userId } });
    if (!account) throw new BadRequestException('account not found');

    const preview = [];
    const errors: Array<{ row: number; error: string }> = [];

    for (let idx = 0; idx < Math.min(rows.length, 10); idx++) {
      const r = rows[idx];

      try {
        const description = (r.description || '').trim();
        if (!description) throw new BadRequestException('missing description');

        const date = parseDateFlexible(r.date);
        const raw = typeof r.amount === 'number' ? r.amount : parseBRNumber(String(r.amount));
        if (!Number.isFinite(raw)) throw new BadRequestException('invalid amount');

        const t = String(r.type || '').toUpperCase();
        const isIncome = t === 'INCOME' || t === 'RECEITA';
        const isExpense = t === 'EXPENSE' || t === 'DESPESA';

        let type: TransactionType;
        let amount: number;

        if (isIncome) {
          type = TransactionType.INCOME;
          amount = Math.abs(raw);
        } else if (isExpense) {
          type = TransactionType.EXPENSE;
          amount = -Math.abs(raw);
        } else {
          type = raw >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE;
          amount = raw;
        }

        preview.push({
          date: `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`,
          description,
          category: r.category || null,
          amount,
          type,
        });
      } catch (e: any) {
        errors.push({ row: idx + 2, error: String(e?.message || e) });
      }
    }

    return { preview, total: rows.length, errors, account: account.name };
  }

  async importCSV(userId: string, accountId: string, buffer: Buffer) {
    const rows: ImportRow[] = [];

    await new Promise<void>((resolve, reject) => {
      const stream = csvParse({ headers: true, ignoreEmpty: true, trim: true })
        .on('error', reject)
        .on('data', (r: Record<string, any>) => {
          // support PT/EN headers
          const map: Record<string, any> = {};
          for (const [k, v] of Object.entries(r)) map[normHeader(k)] = v;

          const date = map['data'] ?? map['date'] ?? map['data ocorrência'] ?? map['data ocorrencia'];
          const description = map['descrição'] ?? map['descricao'] ?? map['description'];
          const category = map['categoria'] ?? map['category'];
          const amount = map['valor'] ?? map['amount'];
          const type = map['tipo'] ?? map['type'];

          // Skip empty rows
          if (!date && !description && !amount) return;

          rows.push({
            date: String(date ?? ''),
            description: String(description ?? ''),
            category: category ? String(category) : undefined,
            amount: amount ?? '',
            type: type ? String(type) : undefined,
          });
        })
        .on('end', () => resolve());

      stream.write(buffer);
      stream.end();
    });

    return this.importRows(userId, accountId, rows);
  }

  async importExcel(userId: string, accountId: string, buffer: Buffer) {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    if (!ws) throw new BadRequestException('No worksheet');

    // Get rows as arrays
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' }) as any[][];
    if (!aoa.length) throw new BadRequestException('Empty worksheet');

    const header = (aoa[0] || []).map((h) => normHeader(String(h ?? '')));
    const rows: ImportRow[] = [];

    for (let i = 1; i < aoa.length; i++) {
      const line = aoa[i] || [];
      const rec: Record<string, any> = {};
      for (let c = 0; c < header.length; c++) {
        const key = header[c];
        if (!key) continue;
        rec[key] = line[c];
      }

      const date = rec['data'] ?? rec['date'] ?? rec['data ocorrência'] ?? rec['data ocorrencia'];
      const description = rec['descrição'] ?? rec['descricao'] ?? rec['description'];
      const category = rec['categoria'] ?? rec['category'];
      const amount = rec['valor'] ?? rec['amount'];
      const type = rec['tipo'] ?? rec['type'];

      // Skip empty rows
      if (!date && !description && !amount) continue;

      rows.push({
        date: String(date ?? ''),
        description: String(description ?? ''),
        category: category ? String(category) : undefined,
        amount: amount ?? '',
        type: type ? String(type) : undefined,
      });
    }

    return this.importRows(userId, accountId, rows);
  }

  private async importRows(userId: string, accountId: string, rows: ImportRow[]) {
    if (!accountId) throw new BadRequestException('accountId is required');
    const account = await this.prisma.account.findFirst({ where: { id: accountId, userId } });
    if (!account) throw new BadRequestException('account not found');

    let inserted = 0;
    const errors: Array<{ row: number; error: string }> = [];

    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx];

      try {
        const description = (r.description || '').trim();
        if (!description) throw new BadRequestException('missing description');

        const date = parseDateFlexible(r.date);

        const raw = typeof r.amount === 'number' ? r.amount : parseBRNumber(String(r.amount));
        if (!Number.isFinite(raw)) throw new BadRequestException('invalid amount');

        // type detection
        const t = String(r.type || '').toUpperCase();
        const isIncome = t === 'INCOME' || t === 'RECEITA';
        const isExpense = t === 'EXPENSE' || t === 'DESPESA';

        let type: TransactionType;
        let amount: number;

        if (isIncome) {
          type = TransactionType.INCOME;
          amount = Math.abs(raw);
        } else if (isExpense) {
          type = TransactionType.EXPENSE;
          amount = -Math.abs(raw);
        } else {
          // fallback by sign
          type = raw >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE;
          amount = raw;
        }

        const categoryId = await this.ensureCategory(userId, r.category);

        await this.prisma.transaction.create({
          data: {
            userId,
            accountId,
            categoryId,
            type,
            date,
            description,
            amount: new Prisma.Decimal(amount.toFixed(2)),
          },
        });

        inserted++;
      } catch (e: any) {
        errors.push({ row: idx + 2, error: String(e?.message || e) }); // +2: header + 1-based
      }
    }

    return { inserted, total: rows.length, errors };
  }

  async export(userId: string, args: { from: string; to: string; accountId?: string; format: 'csv' | 'xlsx' }) {
    const from = parseDateFlexible(args.from);
    const to = parseDateFlexible(args.to);
    to.setHours(23, 59, 59, 999);

    const where: any = { userId, date: { gte: from, lte: to } };
    if (args.accountId) where.accountId = args.accountId;

    const list = await this.prisma.transaction.findMany({
      where,
      include: { account: true, category: true },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });

    if (args.format === 'csv') {
      const header = ['Data Ocorrência', 'Descrição', 'Categoria', 'Valor'];
      const lines = [header.join(',')];

      for (const t of list) {
        const date = new Date(t.date);
        const formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        const row = [
          formattedDate,
          csvEscape(t.description),
          csvEscape(t.category?.name || ''),
          Number(t.amount).toFixed(2).replace('.', ','),
        ];
        lines.push(row.join(','));
      }

      return { contentType: 'text/csv; charset=utf-8', filename: `export_${args.from}_to_${args.to}.csv`, buffer: Buffer.from(lines.join('\n')) };
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Transactions');

    ws.columns = [
      { header: 'Data Ocorrência', key: 'date', width: 15 },
      { header: 'Descrição', key: 'description', width: 40 },
      { header: 'Categoria', key: 'category', width: 18 },
      { header: 'Valor', key: 'amount', width: 12 },
    ];

    for (const t of list) {
      const date = new Date(t.date);
      const formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      ws.addRow({
        date: formattedDate,
        description: t.description,
        category: t.category?.name || '',
        amount: Number(t.amount).toFixed(2).replace('.', ','),
      });
    }

    ws.getRow(1).font = { bold: true };

    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    return { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename: `export_${args.from}_to_${args.to}.xlsx`, buffer };
  }

  async template(format: 'csv' | 'xlsx') {
    const columns = ['Date', 'Description', 'Category', 'Amount', 'Type'];

    if (format === 'csv') {
      const lines = [columns.join(','), '2025-12-01,Supermercado,Alimentação,-199.90,EXPENSE'];
      return { contentType: 'text/csv; charset=utf-8', filename: 'import_template.csv', buffer: Buffer.from(lines.join('\n')) };
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Template');
    ws.addRow(columns);
    ws.addRow(['2025-12-01', 'Supermercado', 'Alimentação', -199.90, 'EXPENSE']);
    ws.getRow(1).font = { bold: true };

    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    return { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename: 'import_template.xlsx', buffer };
  }
}

function csvEscape(value: string) {
  const v = String(value ?? '');
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
