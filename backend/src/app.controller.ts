import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

   /** Para health check da Render (Advanced → Health Check Path: `/api/health`). */
   @Get('health')
   health(): { ok: true } {
     return { ok: true };
   }
}
