import { Action } from "@/components";
import { useModal, withModal } from "@/modules/modals";
import { faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";
import { Button, Group, NumberInput } from "@mantine/core";
import { FunctionComponent, useCallback, useState } from "react";
import { useProcess } from "./ToolContext";

function submodProcessOffset(h: number, m: number, s: number, ms: number) {
  return `shift_offset(h=${h},m=${m},s=${s},ms=${ms})`;
}

const TimeAdjustmentTool: FunctionComponent = () => {
  const [isPlus, setPlus] = useState(true);
  const [offset, setOffset] = useState<[number, number, number, number]>([
    0, 0, 0, 0,
  ]);

  const Modal = useModal();

  const updateOffset = useCallback(
    (idx: number) => {
      return (num: number | undefined) => {
        const newOffset = [...offset] as [number, number, number, number];
        newOffset[idx] = num ?? 0;
        setOffset(newOffset);
      };
    },
    [offset]
  );

  const canSave = offset.some((v) => v !== 0);

  const process = useProcess();

  const submit = useCallback(() => {
    if (canSave) {
      const newOffset = offset.map((v) => (isPlus ? v : -v));
      const action = submodProcessOffset(
        newOffset[0],
        newOffset[1],
        newOffset[2],
        newOffset[3]
      );
      process(action);
    }
  }, [canSave, offset, process, isPlus]);

  const footer = (
    <Button disabled={!canSave} onClick={submit}>
      Save
    </Button>
  );

  return (
    <Modal title="Adjust Times" footer={footer}>
      <Group spacing="xs" noWrap>
        <Action
          icon={isPlus ? faPlus : faMinus}
          color="gray"
          variant="filled"
          onClick={() => setPlus((p) => !p)}
        ></Action>
        <NumberInput
          placeholder="hour"
          onChange={updateOffset(0)}
        ></NumberInput>
        <NumberInput placeholder="min" onChange={updateOffset(1)}></NumberInput>
        <NumberInput placeholder="sec" onChange={updateOffset(2)}></NumberInput>
        <NumberInput placeholder="ms" onChange={updateOffset(3)}></NumberInput>
      </Group>
    </Modal>
  );
};

export default withModal(TimeAdjustmentTool, "time-adjustment");
