let lockCount = 0;
let lockedScrollY = 0;
let previousStyles: Partial<Record<"position" | "top" | "left" | "right" | "width" | "overflow", string>> = {};

function lockBody() {
  if (!import.meta.client || lockCount++ > 0) return;
  lockedScrollY = window.scrollY;
  const style = document.body.style;
  previousStyles = {
    position: style.position,
    top: style.top,
    left: style.left,
    right: style.right,
    width: style.width,
    overflow: style.overflow,
  };
  style.position = "fixed";
  style.top = `-${lockedScrollY}px`;
  style.left = "0";
  style.right = "0";
  style.width = "100%";
  style.overflow = "hidden";
}

function unlockBody() {
  if (!import.meta.client || lockCount === 0 || --lockCount > 0) return;
  const style = document.body.style;
  Object.assign(style, previousStyles);
  window.scrollTo(0, lockedScrollY);
  previousStyles = {};
}

export function useBodyScrollLock(active: Ref<boolean>) {
  let ownsLock = false;

  function sync(value: boolean) {
    if (value && !ownsLock) {
      lockBody();
      ownsLock = true;
    } else if (!value && ownsLock) {
      unlockBody();
      ownsLock = false;
    }
  }

  watch(active, sync, { immediate: true });
  onBeforeUnmount(() => sync(false));
}
