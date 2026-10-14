import { useSyncExternalStore } from 'react';
import type { RoomController } from './RoomController';
export function useRoom(controller: RoomController) { return useSyncExternalStore(controller.subscribe, controller.getSnapshot); }
