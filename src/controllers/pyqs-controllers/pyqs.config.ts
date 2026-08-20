import { Pyq, PyqFields } from "../../models/pyqs/pyq.model.js";
import {
  createResourceControllers,
  ResourceControllerConfig,
} from "../resource/resource.controller.factory.js";

export const pyqsResourceConfig: ResourceControllerConfig<PyqFields> = {
  model: Pyq,
  displayName: "Pyq",
  pluralDisplayName: "pyqs",
  emailContentType: "pyq",
  hasYearField: true,
  managementIdParam: "pyqId",
  responseKeys: {
    singular: "pyq",
    publicList: "pyqs",
    myList: "pyqs",
    adminList: "pyqs",
    modList: "pyqs",
  },
};

export const pyqsControllers = createResourceControllers(pyqsResourceConfig);
