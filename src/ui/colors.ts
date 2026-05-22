/**
 * Color utilities for CLI output using chalk
 */

import chalk from 'chalk';

export const colors = {
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
  dim: chalk.gray,
  highlight: chalk.cyan,
  bold: chalk.bold,
};

export const log = {
  success: (message: string) => console.log(colors.success(message)),
  error: (message: string) => console.error(colors.error(message)),
  warning: (message: string) => console.warn(colors.warning(message)),
  info: (message: string) => console.log(colors.info(message)),
  dim: (message: string) => console.log(colors.dim(message)),
  highlight: (message: string) => console.log(colors.highlight(message)),
};
