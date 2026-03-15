import type { Plugin } from "vue";

export interface Vue2TouchEventsOptions {
  disableClick?: boolean;
  touchClass?: string;
  tapTolerance?: number;
  swipeTolerance?: number;
  touchHoldTolerance?: number;
  longTapTimeInterval?: number;
}

declare const Vue2TouchEvents: Plugin<[Vue2TouchEventsOptions?]>;

export default Vue2TouchEvents;
