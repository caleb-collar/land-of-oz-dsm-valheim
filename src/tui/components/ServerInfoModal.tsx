/**
 * Server Info Modal
 * Displays detailed server information from RCON
 */

import { Box, Text, useInput } from "ink";
import { type FC, useEffect, useState } from "react";
import { rconManager } from "../../rcon/mod.js";
import { theme } from "../theme.js";
import { Spinner } from "./Spinner.js";

type ServerInfoModalProps = {
  onClose: () => void;
};

/**
 * Server Information Modal
 * Shows detailed server stats from RCON info command
 */
export const ServerInfoModal: FC<ServerInfoModalProps> = ({ onClose }) => {
  const [info, setInfo] = useState<string>("");
  const [ping, setPing] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInfo = async () => {
      setLoading(true);
      const [infoResponse, pingResponse] = await Promise.all([
        rconManager.getServerInfo(),
        rconManager.pingServer(),
      ]);
      setInfo(infoResponse || "No info available");
      setPing(pingResponse || "");
      setLoading(false);
    };
    fetchInfo();
  }, []);

  useInput((input, key) => {
    if (key.escape || input === "q" || input === "Q") {
      onClose();
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.primary}
      padding={1}
      width={70}
    >
      <Box marginBottom={1}>
        <Text bold color={theme.primary}>
          Server Information
        </Text>
      </Box>

      {loading ? (
        <Box marginY={2}>
          <Spinner label="Fetching server info..." />
        </Box>
      ) : (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text bold>Info:</Text>
          </Box>
          <Box marginLeft={2} marginBottom={1}>
            <Text>{info}</Text>
          </Box>

          {ping && (
            <>
              <Box marginBottom={1}>
                <Text bold>Ping:</Text>
              </Box>
              <Box marginLeft={2} marginBottom={1}>
                <Text color={theme.success}>{ping}</Text>
              </Box>
            </>
          )}
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>[Esc/Q] Close</Text>
      </Box>
    </Box>
  );
};
