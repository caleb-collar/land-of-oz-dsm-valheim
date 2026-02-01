/**
 * SelectInput component - Dropdown-style selection
 */

import { Box, Text, useInput } from "ink";
import { type FC, useMemo, useState } from "react";
import { theme } from "../theme.js";

export type SelectOption<T = string> = {
  /** Display label */
  label: string;
  /** Actual value */
  value: T;
  /** Optional description */
  description?: string;
};

export type SelectInputProps<T = string> = {
  /** Available options */
  options: SelectOption<T>[];
  /** Currently selected value */
  value: T;
  /** Callback when selection changes */
  onChange: (value: T) => void;
  /** Callback when Enter is pressed to confirm */
  onSubmit?: (value: T) => void;
  /** Callback when Escape is pressed */
  onCancel?: () => void;
  /** Placeholder when no selection */
  placeholder?: string;
  /** Whether the input is focused/active */
  focus?: boolean;
  /** Label to display before input */
  label?: string;
  /** Maximum visible options (for scrolling) */
  maxVisible?: number;
  /** Whether the dropdown is expanded */
  expanded?: boolean;
};

/**
 * Dropdown-style select component
 * Navigation: ↑/↓ to change selection, Enter to confirm, Escape to cancel
 */
export function SelectInput<T = string>({
  options,
  value,
  onChange,
  onSubmit,
  onCancel,
  placeholder = "Select...",
  focus = true,
  label,
  maxVisible = 5,
  expanded: initialExpanded = false,
}: SelectInputProps<T>): ReturnType<FC> {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [highlightIndex, setHighlightIndex] = useState(() => {
    const idx = options.findIndex((opt) => opt.value === value);
    return idx >= 0 ? idx : 0;
  });
  const [filter, setFilter] = useState("");

  // Filtered options based on search
  const filteredOptions = useMemo(() => {
    if (!filter) return options;
    const lowerFilter = filter.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(lowerFilter) ||
        opt.description?.toLowerCase().includes(lowerFilter)
    );
  }, [options, filter]);

  // Calculate scroll offset for long lists
  const scrollOffset = useMemo(() => {
    if (filteredOptions.length <= maxVisible) return 0;
    const halfVisible = Math.floor(maxVisible / 2);
    const maxOffset = filteredOptions.length - maxVisible;
    return Math.max(0, Math.min(maxOffset, highlightIndex - halfVisible));
  }, [filteredOptions.length, highlightIndex, maxVisible]);

  // Visible options slice
  const visibleOptions = filteredOptions.slice(
    scrollOffset,
    scrollOffset + maxVisible
  );

  // Current selection label
  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption?.label ?? placeholder;

  useInput(
    (input, key) => {
      if (!focus) return;

      // If not expanded, Enter opens dropdown
      if (!expanded) {
        if (key.return || input === " ") {
          setExpanded(true);
          setFilter("");
          // Reset highlight to current selection
          const idx = options.findIndex((opt) => opt.value === value);
          setHighlightIndex(idx >= 0 ? idx : 0);
          return;
        }
        // Escape cancels
        if (key.escape) {
          onCancel?.();
          return;
        }
        // Quick navigation with arrow keys even when collapsed
        if (key.upArrow) {
          const currentIdx = options.findIndex((opt) => opt.value === value);
          const newIdx = Math.max(0, currentIdx - 1);
          onChange(options[newIdx].value);
          return;
        }
        if (key.downArrow) {
          const currentIdx = options.findIndex((opt) => opt.value === value);
          const newIdx = Math.min(options.length - 1, currentIdx + 1);
          onChange(options[newIdx].value);
          return;
        }
        return;
      }

      // Expanded dropdown handling

      // Escape closes dropdown
      if (key.escape) {
        setExpanded(false);
        setFilter("");
        return;
      }

      // Enter selects current highlight
      if (key.return) {
        if (filteredOptions[highlightIndex]) {
          const selected = filteredOptions[highlightIndex];
          onChange(selected.value);
          onSubmit?.(selected.value);
        }
        setExpanded(false);
        setFilter("");
        return;
      }

      // Navigation
      if (key.upArrow) {
        setHighlightIndex((prev) => Math.max(0, prev - 1));
        return;
      }

      if (key.downArrow) {
        setHighlightIndex((prev) =>
          Math.min(filteredOptions.length - 1, prev + 1)
        );
        return;
      }

      // Page up/down for larger lists
      if (key.pageUp || (key.ctrl && input === "u")) {
        setHighlightIndex((prev) => Math.max(0, prev - maxVisible));
        return;
      }

      if (key.pageDown || (key.ctrl && input === "d")) {
        setHighlightIndex((prev) =>
          Math.min(filteredOptions.length - 1, prev + maxVisible)
        );
        return;
      }

      // Backspace for filter
      if (key.backspace || key.delete) {
        setFilter((prev) => prev.slice(0, -1));
        setHighlightIndex(0);
        return;
      }

      // Type to filter
      if (input && !key.ctrl && !key.meta) {
        setFilter((prev) => prev + input);
        setHighlightIndex(0);
        return;
      }
    },
    { isActive: focus }
  );

  return (
    <Box flexDirection="column">
      {/* Header row */}
      <Box>
        {label && (
          <Box marginRight={1}>
            <Text>{label}:</Text>
          </Box>
        )}
        <Box>
          <Text color={focus ? theme.primary : undefined} bold={focus}>
            {displayLabel}
          </Text>
          <Text dimColor> {expanded ? "▲" : "▼"}</Text>
        </Box>
        {focus && !expanded && (
          <Box marginLeft={1}>
            <Text dimColor>[Enter to expand, ↑/↓ to change]</Text>
          </Box>
        )}
      </Box>

      {/* Dropdown */}
      {expanded && (
        <Box
          flexDirection="column"
          marginTop={1}
          borderStyle="single"
          borderColor={theme.primary}
          paddingX={1}
        >
          {/* Filter input if typing */}
          {filter && (
            <Box marginBottom={1}>
              <Text dimColor>Filter: </Text>
              <Text color={theme.primary}>{filter}</Text>
            </Box>
          )}

          {/* Scroll indicator top */}
          {scrollOffset > 0 && (
            <Box>
              <Text dimColor> ↑ more ({scrollOffset})</Text>
            </Box>
          )}

          {/* Options list */}
          {filteredOptions.length === 0 ? (
            <Box>
              <Text dimColor>No matches</Text>
            </Box>
          ) : (
            visibleOptions.map((option, visibleIdx) => {
              const actualIdx = scrollOffset + visibleIdx;
              const isHighlighted = actualIdx === highlightIndex;
              const isSelected = option.value === value;

              return (
                <Box key={String(option.value)} paddingY={0}>
                  <Text
                    color={
                      isHighlighted
                        ? theme.primary
                        : isSelected
                          ? theme.success
                          : undefined
                    }
                    bold={isHighlighted}
                    inverse={isHighlighted}
                  >
                    {isSelected ? "● " : "  "}
                    {option.label}
                  </Text>
                  {option.description && (
                    <Text dimColor> - {option.description}</Text>
                  )}
                </Box>
              );
            })
          )}

          {/* Scroll indicator bottom */}
          {scrollOffset + maxVisible < filteredOptions.length && (
            <Box>
              <Text dimColor>
                ↓ more ({filteredOptions.length - scrollOffset - maxVisible})
              </Text>
            </Box>
          )}

          {/* Help */}
          <Box marginTop={1}>
            <Text dimColor>
              ↑/↓ navigate • Enter select • Esc close • type to filter
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
