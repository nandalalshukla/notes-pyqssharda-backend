import {
  Syllabus,
  SyllabusFields,
} from "../../models/syllabus/syllabus.model.js";
import {
  createResourceControllers,
  ResourceControllerConfig,
} from "../resource/resource.controller.factory.js";

export const syllabusResourceConfig: ResourceControllerConfig<SyllabusFields> =
  {
    model: Syllabus,
    displayName: "Syllabus",
    pluralDisplayName: "syllabus",
    emailContentType: "syllabus",
    hasYearField: false,
    managementIdParam: "syllabusId",
    responseKeys: {
      singular: "syllabus",
      publicList: "syllabuses",
      myList: "syllabus",
      adminList: "syllabus",
      modList: "syllabus",
    },
  };

export const syllabusControllers = createResourceControllers(
  syllabusResourceConfig,
);
