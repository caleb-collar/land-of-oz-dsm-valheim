/**
 * Modal component for overlay dialogs
 */

import { Box, Text, useInput } from "ink";
import type { FC, ReactNode } from "react";
import { useStore } from "../store.js";
import { theme } from "../theme.js";

type ModalProps = {
  /** Modal title */
  title: string;
  /** Modal content */
  children: ReactNode;
  /** Width of the modal */
  width?: number;
};

/**
 * Modal overlay dialog
 */
export const Modal: FC<ModalProps> = (props: ModalProps) => {
  const { title, children, width = 50 } = props;
  const closeModal = useStore((s) => s.actions.closeModal);

  // Handle ESC to close modal
  useInput((_input, key) => {
    if (key.escape) {
      closeModal();
    }
  });

  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="double"
      borderColor={theme.primary}
      backgroundColor={theme.background}
      paddingX={2}
      paddingY={1}
    >
      {/* Title bar */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color={theme.primary}>
          {title}
        </Text>
        <Text dimColor>[ESC to close]</Text>
      </Box>

      {/* Content */}
      <Box flexDirection="column">{children}</Box>
    </Box>
  );
};

/**
 * Confirmation modal for destructive actions
 */
type ConfirmModalProps = {
  /** Message to display */
  message: string;
  /** Callback when confirmed */
  onConfirm: () => void;
  /** Callback when cancelled */
  onCancel: () => void;
};

export const ConfirmModal: FC<ConfirmModalProps> = (
  props: ConfirmModalProps
) => {
  const { message, onConfirm, onCancel } = props;
  useInput((input, key) => {
    if (input === "y" || input === "Y") {
      onConfirm();
    } else if (input === "n" || input === "N" || key.escape) {
      onCancel();
    }
  });

  return (
    <Modal title="Confirm" width={40}>
      <Text>{message}</Text>
      <Box marginTop={1}>
        <Text color={theme.success}>[Y] Yes</Text>
        <Text />
        <Text color={theme.error}>[N] No</Text>
      </Box>
    </Modal>
  );
};
