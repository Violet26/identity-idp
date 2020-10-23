import React, { useState, useMemo, useContext } from 'react';
import { Alert } from '@18f/identity-components';
import FormSteps from './form-steps';
import { UploadFormEntriesError } from '../services/upload';
import DocumentsStep from './documents-step';
import SelfieStep from './selfie-step';
import ReviewIssuesStep from './review-issues-step';
import MobileIntroStep from './mobile-intro-step';
import DeviceContext from '../context/device';
import ServiceProviderContext from '../context/service-provider';
import Submission from './submission';
import SubmissionStatus from './submission-status';
import DesktopDocumentDisclosure from './desktop-document-disclosure';
import useI18n from '../hooks/use-i18n';
import { RetrySubmissionError } from './submission-complete';

/** @typedef {import('react').ReactNode} ReactNode */
/** @typedef {import('./form-steps').FormStep} FormStep */
/** @typedef {import('../context/upload').UploadFieldError} UploadFieldError */

/**
 * Returns a new object with specified keys removed.
 *
 * @template {Record<string,any>} T
 *
 * @param {T} object Original object.
 * @param {...string} keys Keys to remove.
 *
 * @return {Partial<T>} Object with keys removed.
 */
export const omit = (object, ...keys) =>
  Object.entries(object).reduce((result, [key, value]) => {
    if (!keys.includes(key)) {
      result[key] = value;
    }

    return result;
  }, {});

/**
 * @typedef DocumentCaptureProps
 *
 * @prop {boolean=} isAsyncPollingSubmission Whether submission should poll for async response.
 */

/**
 * @param {DocumentCaptureProps} props
 */
function DocumentCapture({ isAsyncPollingSubmission = false }) {
  const [formValues, setFormValues] = useState(/** @type {Record<string,any>?} */ (null));
  const [submissionError, setSubmissionError] = useState(/** @type {Error?} */ (null));
  const { t } = useI18n();
  const { isMobile } = useContext(DeviceContext);
  const serviceProvider = useContext(ServiceProviderContext);

  /**
   * Clears error state and sets form values for submission.
   *
   * @param {Record<string,any>} nextFormValues Submitted form values.
   */
  function submitForm(nextFormValues) {
    setSubmissionError(null);
    setFormValues(nextFormValues);
  }

  const submissionFormValues = useMemo(
    () =>
      formValues && isAsyncPollingSubmission
        ? omit(formValues, 'front', 'back', 'selfie')
        : formValues,
    [isAsyncPollingSubmission, formValues],
  );

  let initialActiveErrors;
  if (submissionError instanceof UploadFormEntriesError) {
    initialActiveErrors = submissionError.formEntryErrors.map((error) => ({
      field: error.field,
      error,
    }));
  }

  /** @type {FormStep[]} */
  const steps = submissionError
    ? [
        {
          name: 'review',
          title: t('doc_auth.headings.review_issues'),
          form: ReviewIssuesStep,
          footer: DesktopDocumentDisclosure,
        },
      ]
    : /** @type {FormStep[]} */ ([
        isMobile && {
          name: 'intro',
          title: t('doc_auth.headings.document_capture'),
          form: MobileIntroStep,
        },
        {
          name: 'documents',
          title: t('doc_auth.headings.document_capture'),
          form: DocumentsStep,
          footer: DesktopDocumentDisclosure,
        },
        serviceProvider.isLivenessRequired && {
          name: 'selfie',
          title: t('doc_auth.headings.selfie'),
          form: SelfieStep,
        },
      ].filter(Boolean));

  if (submissionError instanceof RetrySubmissionError) {
    return (
      <SubmissionStatus
        onError={(nextSubmissionError) => setSubmissionError(nextSubmissionError)}
      />
    );
  }

  if (submissionFormValues && !submissionError) {
    return (
      <Submission
        payload={submissionFormValues}
        onError={(nextSubmissionError) => setSubmissionError(nextSubmissionError)}
      />
    );
  }

  return (
    <>
      {submissionError && !(submissionError instanceof UploadFormEntriesError) && (
        <Alert type="error" className="margin-bottom-4 margin-top-2 tablet:margin-top-0">
          {t('errors.doc_auth.acuant_network_error')}
        </Alert>
      )}
      <FormSteps
        steps={steps}
        initialValues={submissionError && formValues ? formValues : undefined}
        initialActiveErrors={initialActiveErrors}
        onComplete={submitForm}
        autoFocus={!!submissionError}
      />
    </>
  );
}

export default DocumentCapture;
