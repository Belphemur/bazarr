import { useMovieSubtitleModification } from "@/apis/hooks";
import { withModal } from "@/modules/modals";
import { createTask, dispatchTask } from "@/modules/task/utilities";
import {
  useLanguageProfileBy,
  useProfileItemsToLanguages,
} from "@/utilities/languages";
import { FunctionComponent, useCallback } from "react";
import SubtitleUploader, {
  PendingSubtitle,
  Validator,
} from "./SubtitleUploadModal";

interface Props {
  payload: Item.Movie;
}

const MovieUploadModal: FunctionComponent<Props> = ({ payload }) => {
  const profile = useLanguageProfileBy(payload.profileId);

  const availableLanguages = useProfileItemsToLanguages(profile);

  const update = useCallback(async (list: PendingSubtitle<unknown>[]) => {
    return list;
  }, []);

  const {
    upload: { mutateAsync },
  } = useMovieSubtitleModification();

  const validate = useCallback<Validator<unknown>>(
    (item) => {
      if (item.language === null) {
        return {
          state: "error",
          messages: ["Language is not selected"],
        };
      } else if (
        payload.subtitles.find((v) => v.code2 === item.language?.code2) !==
        undefined
      ) {
        return {
          state: "warning",
          messages: ["Override existing subtitle"],
        };
      }
      return {
        state: "valid",
        messages: [],
      };
    },
    [payload.subtitles]
  );

  const upload = useCallback(
    (items: PendingSubtitle<unknown>[]) => {
      const { radarrId } = payload;

      const tasks = items
        .filter((v) => v.language !== null)
        .map((v) => {
          const { file, language, forced, hi } = v;

          if (language === null) {
            throw new Error("Language is not selected");
          }

          return createTask(file.name, mutateAsync, {
            radarrId,
            form: {
              file,
              forced,
              hi,
              language: language.code2,
            },
          });
        });

      dispatchTask(tasks, "upload-subtitles");
    },
    [mutateAsync, payload]
  );

  return (
    <SubtitleUploader
      hideAllLanguages
      initial={{ forced: false }}
      availableLanguages={availableLanguages}
      columns={[]}
      upload={upload}
      update={update}
      validate={validate}
    ></SubtitleUploader>
  );
};

export default withModal(MovieUploadModal, "movie-upload");
