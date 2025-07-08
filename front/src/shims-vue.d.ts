/* eslint-disable */
declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module "vue2-touch-events" {
  import { App } from "vue";
  const Vue2TouchEvents: {
    install(app: App): void;
  };
  export default Vue2TouchEvents;
}

declare module "universal-cookie" {
  export default class Cookies {
    constructor(cookies?: string);
    get(name: string): any;
    set(name: string, value: any, options?: any): void;
    remove(name: string, options?: any): void;
  }
}
