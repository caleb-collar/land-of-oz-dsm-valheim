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

/**
 * Modal for deleting a world with optional backup deletion
 */
type DeleteWorldModalProps = {
  /** World name to delete */
  worldName: string;
  /** Number of backups this world has */
  backupCount: number;
  /** Callback when delete confirmed (includeBackups: true if user wants to delete backups) */
  onConfirm: (includeBackups: boolean) => void;
  /** Callback when cancelled */
  onCancel: () => void;
};

export const DeleteWorldModal: FC<DeleteWorldModalProps> = (
  props: DeleteWorldModalProps
) => {
  const { worldName, backupCount, onConfirm, onCancel } = props;

  useInput((input, key) => {
    if (backupCount > 0) {
      // Has backups: Y = delete with backups, N = delete without, Esc = cancel
      if (input === "y" || input === "Y") {
        onConfirm(true);
      } else if (input === "n" || input === "N") {
        onConfirm(false);
      } else if (key.escape) {
        onCancel();
      }
    } else {
      // No backups: simple confirm
      if (input === "y" || input === "Y") {
        onConfirm(false);
      } else if (input === "n" || input === "N" || key.escape) {
        onCancel();
      }
    }
  });

  if (backupCount > 0) {
    return (
      <Modal title="Delete World" width={50}>
        <Text>Delete world "{worldName}"?</Text>
        <Box marginTop={1}>
          <Text dimColor>
            This world has {backupCount} backup{backupCount === 1 ? "" : "s"}.
          </Text>
        </Box>
        <Box marginTop={1} flexDirection="column">
          <Text color={theme.success}>[Y] Delete world and backups</Text>
          <Text color={theme.warning}>[N] Delete world only</Text>
          <Text color={theme.error}>[Esc] Cancel</Text>
        </Box>
      </Modal>
    );
  }

  return (
    <Modal title="Confirm" width={40}>
      <Text>Delete world "{worldName}"? This cannot be undone!</Text>
      <Box marginTop={1}>
        <Text color={theme.success}>[Y] Yes</Text>
        <Text />
        <Text color={theme.error}>[N] No</Text>
      </Box>
    </Modal>
  );
};
