import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ExtensionSlot,
  showNotification,
  showToast,
  useLayoutType,
  usePatient,
} from "@openmrs/esm-framework";
import { Button, FormLabel, InlineLoading } from "@carbon/react";
import styles from "./forms.scss";
import { closeOverlay } from "../hooks/useOverlay";
import { MedicationDispense, MedicationDispenseStatus } from "../types";
import { saveMedicationDispense } from "../medication-dispense/medication-dispense.resource";
import MedicationDispenseReview from "./medication-dispense-review.component";
import { revalidate } from "../utils";

interface DispenseFormProps {
  medicationDispense: MedicationDispense;
  mode: "enter" | "edit";
  patientUuid?: string;
  encounterUuid: string;
}

const DispenseForm: React.FC<DispenseFormProps> = ({
  medicationDispense,
  mode,
  patientUuid,
  encounterUuid,
}) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === "tablet";
  const { patient, isLoading } = usePatient(patientUuid);

  // Keep track of medication dispense payload
  const [medicationDispensePayload, setMedicationDispensePayload] =
    useState<MedicationDispense>();

  // whether or not the form is valid and ready to submit
  const [isValid, setIsValid] = useState(false);

  // to prevent duplicate submits
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Submit medication dispense form
  const handleSubmit = () => {
    if (!isSubmitting) {
      setIsSubmitting(true);
      const abortController = new AbortController();
      saveMedicationDispense(
        medicationDispensePayload,
        MedicationDispenseStatus.completed,
        abortController
      ).then(
        ({ status }) => {
          if (status === 201 || status === 200) {
            closeOverlay();
            revalidate(encounterUuid);
            showToast({
              critical: true,
              kind: "success",
              description: t(
                "medicationListUpdated",
                "Medication dispense list has been updated."
              ),
              title: t(
                mode === "enter"
                  ? "medicationDispensed"
                  : "medicationDispenseUpdated",
                mode === "enter"
                  ? "Medication successfully dispensed."
                  : "Dispense record successfully updated."
              ),
            });
          }
        },
        (error) => {
          showNotification({
            title: t(
              mode === "enter"
                ? "medicationDispenseError"
                : "medicationDispenseUpdatedError",
              mode === "enter"
                ? "Error dispensing medication."
                : "Error updating dispense record"
            ),
            kind: "error",
            critical: true,
            description: error?.message,
          });
          setIsSubmitting(false);
        }
      );
    }
  };

  const checkIsValid = () => {
    if (
      medicationDispensePayload &&
      medicationDispensePayload.quantity?.value &&
      medicationDispensePayload.quantity?.code &&
      medicationDispensePayload.dosageInstruction[0]?.doseAndRate[0]
        ?.doseQuantity?.value &&
      medicationDispensePayload.dosageInstruction[0]?.doseAndRate[0]
        ?.doseQuantity?.code &&
      medicationDispensePayload.dosageInstruction[0]?.route?.coding[0].code &&
      medicationDispensePayload.dosageInstruction[0]?.timing?.code.coding[0]
        .code &&
      (!medicationDispensePayload.substitution.wasSubstituted ||
        (medicationDispensePayload.substitution.reason[0]?.coding[0].code &&
          medicationDispensePayload.substitution.type?.coding[0].code))
    ) {
      setIsValid(true);
    } else {
      setIsValid(false);
    }
  };

  // initialize the internal dispense payload with the dispenses passed in as props
  useEffect(
    () => setMedicationDispensePayload(medicationDispense),
    [medicationDispense]
  );

  // check is valid on any changes
  useEffect(checkIsValid, [medicationDispensePayload]);

  const bannerState = useMemo(() => {
    if (patient) {
      return {
        patient,
        patientUuid,
        hideActionsOverflow: true,
      };
    }
  }, [patient, patientUuid]);

  return (
    <div className="">
      <div className={styles.formWrapper}>
        {isLoading && (
          <InlineLoading
            className={styles.bannerLoading}
            iconDescription="Loading"
            description="Loading banner"
            status="active"
          />
        )}
        {patient && (
          <ExtensionSlot
            extensionSlotName="patient-header-slot"
            state={bannerState}
          />
        )}
        <section className={styles.formGroup}>
          {/* <span style={{ marginTop: "1rem" }}>1. {t("drug", "Drug")}</span>*/}
          <FormLabel>
            {t(
              "drugHelpText",
              "You may edit the formulation and quantity dispensed here"
            )}
          </FormLabel>
          {medicationDispensePayload ? (
            <MedicationDispenseReview
              medicationDispense={medicationDispensePayload}
              updateMedicationDispense={setMedicationDispensePayload}
            />
          ) : null}
        </section>
        <section className={styles.buttonGroup}>
          <Button onClick={() => closeOverlay()} kind="secondary">
            {t("cancel", "Cancel")}
          </Button>
          <Button disabled={!isValid || isSubmitting} onClick={handleSubmit}>
            {t(
              mode === "enter" ? "dispensePrescription" : "saveChanges",
              mode === "enter" ? "Dispense prescription" : "Save changes"
            )}
          </Button>
        </section>
      </div>
    </div>
  );
};

export default DispenseForm;
