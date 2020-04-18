import path from 'path';
import fs from 'fs';
import parse from 'csv-parse';
import Transaction from '../models/Transaction';
import uploadConfig from '../config/upload';
import AppError from '../errors/AppError';
import CreateTransationService from './CreateTransactionService';

interface Request {
  file: string;
}
interface ImportCSV {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}
interface Request {
  file: string;
}

class ImportTransactionsService {
  async execute({ file }: Request): Promise<Transaction[]> {
    const filePath = path.join(uploadConfig.directory, file);
    const csvTransactions: ImportCSV[] = [];
    const transactions: Transaction[] = [];

    const stream = fs
      .createReadStream(filePath)
      .on('error', () => {
        throw new AppError('Error on import file');
      })
      .pipe(parse({ columns: true, trim: true }))
      .on('data', async row => {
        csvTransactions.push(row);
      });

    await new Promise(resolver => {
      fs.promises.unlink(filePath);
      stream.on('end', resolver);
    });

    const createTransactionService = new CreateTransationService();

    for (const item of csvTransactions) {
      const transaction = await createTransactionService.execute(item);

      transactions.push(transaction);
    }

    return transactions;
  }
}

export default ImportTransactionsService;
