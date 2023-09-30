import express from 'express';
import {ApplicationConfig, ApiLoopbackApplication} from './application';
import * as http from 'http';
import {once} from 'events';

export {ApplicationConfig};

export class ExpressServer {
  public readonly app: express.Application;
  public readonly lbApp: ApiLoopbackApplication;
  private server?: http.Server;

  constructor(options: ApplicationConfig = {}) {
    this.app = express();
    this.lbApp = new ApiLoopbackApplication(options);

    this.app.use('/api', this.lbApp.requestHandler);
  }

  async boot() {
    await this.lbApp.boot();
  }

  public async start() {
    await this.lbApp.start();
    const port = this.lbApp.restServer.config.port ?? 3000;
    const host = this.lbApp.restServer.config.host || '127.0.0.1';
    this.server = this.app.listen(port, host);
    await once(this.server, 'listening');
  }
}
