import { RobotAuthGuard } from './robot-auth.guard';
import { RobotsService } from '../../robots/robots.service';

describe('RobotAuthGuard', () => {
  let guard: RobotAuthGuard;

  beforeEach(() => {
    const robotsServiceMock: Partial<RobotsService> = {
      findByApiKeyHash: jest.fn(),
    };

    guard = new RobotAuthGuard(robotsServiceMock as RobotsService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });
});
