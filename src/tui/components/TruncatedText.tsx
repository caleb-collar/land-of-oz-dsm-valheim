/**
 * TruncatedText component
 * Truncates text to a maximum width with configurable ellipsis
 */

import { Text } from "ink";
import type { FC } from "react";

/** Props for TruncatedText */
type TruncatedTextProps = {
  /** Text content to display */
  children: string;
  /** Maximum character width before truncation */
  maxWidth: number;
  /** Ellipsis string to append when truncated (default: "…") */
  ellipsis?: string;
  /** Text color */
  color?: string;
  /** Whether text should be bold */
  bold?: boolean;
  /** Whether text should be dimmed */
  dimColor?: boolean;
};

/**
 * Displays text truncated to a maximum width with ellipsis.
 * Useful for long paths, values, and labels that might overflow.
 */
export const TruncatedText: FC<TruncatedTextProps> = ({
  children,
  maxWidth,
  ellipsis = "…",
  color,
  bold,
  dimColor,
}) => {
  const text =
    children.length > maxWidth
      ? children.slice(0, maxWidth - ellipsis.length) + ellipsis
      : children;

  return (
    <Text color={color} bold={bold} dimColor={dimColor}>
      {text}
    </Text>
  );
};
