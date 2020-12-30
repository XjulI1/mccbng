import {ApplicationConfig, ExpressServer} from './server';
export {ApplicationConfig, ExpressServer};

export * from './application';

export async function main(options: ApplicationConfig = {}) {
  const app = new ExpressServer(options);
  await app.boot();
  await app.start();

  const url = 'http://' + options.rest.host + ':' + options.rest.port;
  console.log(`Server is running at ${url}`);
  console.log(`Try ${url}/api/ping`);
}

if (require.main === module) {
  // Run the application
  const config = {
    rest: {
      port: +(process.env.PORT ?? 3000),
      host: process.env.HOST ?? 'localhost',
      openApiSpec: {
        // useful when used with OpenAPI-to-GraphQL to locate your application
        setServersFromRequest: true,
      },
      // Use the LB4 application as a route. It should not be listening.
      listenOnStart: false,
    },
  };
  main(config).catch(err => {
    console.error('Cannot start the application.', err);
    process.exit(1);
  });
}
