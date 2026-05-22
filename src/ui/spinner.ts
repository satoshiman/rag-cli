/**
 * Spinner utilities for progress indication using ora
 */

import ora, { Ora } from 'ora';

let activeSpinner: Ora | null = null;

export function startSpinner(text: string): Ora {
  if (activeSpinner) {
    activeSpinner.stop();
  }
  activeSpinner = ora(text).start();
  return activeSpinner;
}

export function stopSpinner(text?: string, symbol?: string): void {
  if (activeSpinner) {
    if (text) {
      activeSpinner.stopAndPersist({ text, symbol });
    } else {
      activeSpinner.stop();
    }
    activeSpinner = null;
  }
}

export function succeedSpinner(text: string): void {
  if (activeSpinner) {
    activeSpinner.succeed(text);
    activeSpinner = null;
  }
}

export function failSpinner(text: string): void {
  if (activeSpinner) {
    activeSpinner.fail(text);
    activeSpinner = null;
  }
}

export function warnSpinner(text: string): void {
  if (activeSpinner) {
    activeSpinner.warn(text);
    activeSpinner = null;
  }
}

export function infoSpinner(text: string): void {
  if (activeSpinner) {
    activeSpinner.info(text);
    activeSpinner = null;
  }
}
