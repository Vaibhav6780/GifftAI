import type { KeyboardEvent } from "react";

const BULLET = "• "; // "• "

/** React's controlled-input tracking intercepts the plain DOM `.value` setter, so an
 *  imperative edit has to go through the native setter and then fire a real "input" event
 *  for react-hook-form's registered onChange to see the new value. */
function setNativeValue(element: HTMLTextAreaElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Enter-key handler for task Description fields: turns the field into a bullet list instead
 *  of one flowing paragraph. The first Enter press bullets the line being split and starts a
 *  new bullet below it; further Enters keep continuing the list; pressing Enter on an already-
 *  empty bullet line exits the list (plain newline), same as Word/Notion. */
export function handleBulletListKeyDown(e: KeyboardEvent<HTMLTextAreaElement>): void {
  if (e.key !== "Enter" || e.shiftKey) return;

  const textarea = e.currentTarget;
  const { selectionStart, selectionEnd, value } = textarea;
  if (selectionStart !== selectionEnd) return; // let the browser replace the selection normally

  const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const currentLine = value.slice(lineStart, selectionStart);
  const bulletMatch = /^(\s*)• ?/.exec(currentLine);

  e.preventDefault();

  if (bulletMatch && currentLine.trim() === "•") {
    const nextValue = value.slice(0, lineStart) + value.slice(selectionStart);
    setNativeValue(textarea, nextValue);
    textarea.selectionStart = textarea.selectionEnd = lineStart;
    return;
  }

  if (!bulletMatch && currentLine.trim().length === 0) {
    const nextValue = value.slice(0, selectionStart) + BULLET + value.slice(selectionStart);
    setNativeValue(textarea, nextValue);
    const cursor = selectionStart + BULLET.length;
    textarea.selectionStart = textarea.selectionEnd = cursor;
    return;
  }

  const indent = bulletMatch?.[1] ?? "";
  const prefixCurrentLine = bulletMatch ? "" : BULLET;
  const insertion = `\n${indent}${BULLET}`;

  const nextValue =
    value.slice(0, lineStart) + prefixCurrentLine + value.slice(lineStart, selectionStart) + insertion + value.slice(selectionStart);
  setNativeValue(textarea, nextValue);
  const cursor = lineStart + prefixCurrentLine.length + (selectionStart - lineStart) + insertion.length;
  textarea.selectionStart = textarea.selectionEnd = cursor;
}
