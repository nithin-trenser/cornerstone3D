import { eventTarget, triggerEvent } from '@cornerstonejs/core';
import { Events } from '../../enums';
import type { AnnotationDirtyChangeEventDetail } from '../../types/EventTypes';
import { getAnnotation } from './annotationState';

/*
 * Constants
 */
const globalDirtyAnnotationUIDsSet: Set<string> = new Set();

/*
 * Interface (Public API)
 */

/**
 * Set the "dirty" state of a given annotation instance.
 *
 * @triggers ANNOTATION_DIRTY_CHANGE
 *
 * @param annotationUID - The UID of the annotation which will have
 * its dirty state changed. An event will only be triggered if the dirty state
 * of the given annotation instance changed.
 * @param dirty - A boolean value indicating if the instance should
 * be dirty (true) or not (false)
 */
function setAnnotationDirty(annotationUID: string, dirty = true): void {
  const detail = makeEventDetail();
  if (annotationUID) {
    if (dirty) {
      setDirty(annotationUID, globalDirtyAnnotationUIDsSet, detail);
    } else {
      unSetDirty(annotationUID, globalDirtyAnnotationUIDsSet, detail);
    }
  }
  publish(detail, globalDirtyAnnotationUIDsSet);
}

/**
 * Clears all the dirty annotations
 */
function cleanAllAnnotations(): void {
  const detail = makeEventDetail();
  clearDirtyAnnotationsSet(globalDirtyAnnotationUIDsSet, detail);
  publish(detail, globalDirtyAnnotationUIDsSet);
}

/**
 * Returns an array of all the annotation UIDs that are currently dirty
 * @returns An array of annotation UIDs.
 */
function getDirtyAnnotations(): Array<string> {
  return Array.from(globalDirtyAnnotationUIDsSet);
}

/**
 * Given an annotation UID, return true if it is dirty.
 * @param annotationUID - Annotation UID
 * @returns A boolean value.
 */
function isAnnotationDirty(annotationUID: string): boolean {
  return globalDirtyAnnotationUIDsSet.has(annotationUID);
}

/**
 * Get the number of dirty annotation UIDs in the global set of dirty annotation UIDs.
 * @returns The number of dirty annotation UIDs.
 */
function getDirtyAnnotationsCount(): number {
  return globalDirtyAnnotationUIDsSet.size;
}

/**
 * Properly initialize the isDirty state for an annotation based on its UID.
 * @param annotationUID - The UID of the annotation to be checked.
 */
function checkAndSetDirtyAnnotation(annotationUID: string): boolean {
  const isDirty = isAnnotationDirty(annotationUID);
  setAnnotationDirty(annotationUID, isDirty);

  return isDirty;
}

/*
 * Private Helpers
 */

function makeEventDetail(): AnnotationDirtyChangeEventDetail {
  return Object.freeze({
    added: [],
    removed: [],
    dirty: [],
  });
}

function setDirty(
  annotationUID: string,
  dirtyAnnotationUIDsSet: Set<string>,
  detail: AnnotationDirtyChangeEventDetail
): void {
  if (!dirtyAnnotationUIDsSet.has(annotationUID)) {
    dirtyAnnotationUIDsSet.add(annotationUID);
    detail.added.push(annotationUID);
    const annotation = getAnnotation(annotationUID);

    if (annotation) {
      annotation.isDirty = true;
    }
  }
}

function unSetDirty(
  annotationUID: string,
  dirtyAnnotationUIDsSet: Set<string>,
  detail: AnnotationDirtyChangeEventDetail
): void {
  if (dirtyAnnotationUIDsSet.delete(annotationUID)) {
    detail.removed.push(annotationUID);

    const annotation = getAnnotation(annotationUID);

    if (annotation) {
      annotation.isDirty = false;
    }
  }
}

function clearDirtyAnnotationsSet(
  dirtyAnnotationUIDsSet: Set<string>,
  detail: AnnotationDirtyChangeEventDetail
): void {
  dirtyAnnotationUIDsSet.forEach((annotationUID) => {
    unSetDirty(annotationUID, dirtyAnnotationUIDsSet, detail);
  });
}

function publish(
  detail: AnnotationDirtyChangeEventDetail,
  dirtyAnnotationUIDsSet: Set<string>
) {
  if (detail.added.length > 0 || detail.removed.length > 0) {
    dirtyAnnotationUIDsSet.forEach((item) => void detail.dirty.push(item));
    triggerEvent(eventTarget, Events.ANNOTATION_DIRTY_STATE_CHANGE, detail);
  }
}

export {
  setAnnotationDirty,
  getDirtyAnnotations,
  getDirtyAnnotationsCount,
  cleanAllAnnotations,
  isAnnotationDirty,
  checkAndSetDirtyAnnotation,
};
