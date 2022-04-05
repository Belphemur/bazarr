import { useRestoreBackups } from "@/apis/hooks/system";
import { AsyncButton } from "@/components/async";
import {
  useModal,
  useModalControl,
  usePayload,
  withModal,
} from "@/modules/modals";
import { Button, Text } from "@mantine/core";
import React, { FunctionComponent } from "react";

const SystemBackupRestoreModal: FunctionComponent = () => {
  const result = usePayload<string>();

  const Modal = useModal();
  const { hide } = useModalControl();

  const { mutateAsync } = useRestoreBackups();

  const footer = (
    <div className="d-flex flex-row-reverse flex-grow-1 justify-content-between">
      <div>
        <Button
          color="gray"
          variant="outline"
          className="mr-2"
          onClick={() => hide()}
        >
          Cancel
        </Button>
        <AsyncButton
          noReset
          promise={() => {
            if (result) {
              return mutateAsync(result);
            } else {
              return null;
            }
          }}
          onSuccess={() => hide()}
        >
          Restore
        </AsyncButton>
      </div>
    </div>
  );

  return (
    <Modal title="Restore Backup" footer={footer}>
      <Text>
        Are you sure you want to restore the backup '{result}'? Bazarr will
        automatically restart and reload the UI during the restore process.
      </Text>
    </Modal>
  );
};

export default withModal(SystemBackupRestoreModal, "restore");
