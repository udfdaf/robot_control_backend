import * as fs from 'fs';
import * as path from 'path';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const LOG_DIR = process.env.LOG_DIR || path.resolve(process.cwd(), 'logs');

// logs 폴더가 없으면 생성 (Docker에서도 필수)
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// 일자별 회전 로그
const rotateTransport = new DailyRotateFile({
  filename: path.join(LOG_DIR, 'app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxFiles: '14d',
});

// Admin이 읽기 쉬운 “고정 파일”
const fileTransport = new winston.transports.File({
  filename: path.join(LOG_DIR, 'app.log'),
});

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    rotateTransport,
    fileTransport,
    new winston.transports.Console(),
  ],
});
