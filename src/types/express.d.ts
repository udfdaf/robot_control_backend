import { Robot } from '../robots/robot.entity';

declare global {
  namespace Express {
    interface Request {
      robot?: Robot;
    }
  }
}

export {};
