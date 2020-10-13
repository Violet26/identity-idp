import React, { useEffect, useRef, useState } from 'react';
import { Alert } from '@18f/identity-components';
import {
  track as trackPromise,
  isPending as isPromisePending,
} from '@18f/identity-promise-pending';
import Button from './button';
import PageHeading from './page-heading';
import FormErrorMessage, { RequiredValueMissingError } from './form-error-message';
import useI18n from '../hooks/use-i18n';
import useHistoryParam from '../hooks/use-history-param';
import useForceRender from '../hooks/use-force-render';

/**
 * @typedef FormStepError
 *
 * @prop {keyof V} field Name of field for which error occurred.
 * @prop {Error} error Error object.
 *
 * @template V
 */

/**
 * @typedef FormStepRegisterFieldOptions
 *
 * @prop {boolean} isRequired Whether field is required.
 */

/**
 * @typedef FormStepComponentProps
 *
 * @prop {(nextValues:Partial<V>)=>void} onChange Values change callback, merged with
 * existing values.
 * @prop {Partial<V>} value Current values.
 * @prop {FormStepError<V>[]} errors Current active errors.
 * @prop {(
 *   field:string,
 *   options?:Partial<FormStepRegisterFieldOptions>
 * )=>undefined|import('react').RefCallback<HTMLElement>} registerField Registers field
 * by given name, returning ref assignment function.
 *
 * @template V
 */

/**
 * @typedef FormStep
 *
 * @prop {string} name Step name, used in history parameter.
 * @prop {string} title Step title, shown as heading.
 * @prop {import('react').FC<FormStepComponentProps<Record<string,any>>>} form Step form component.
 * @prop {import('react').FC=} footer Optional step footer component.
 */

/**
 * @typedef FieldsRefEntry
 *
 * @prop {import('react').RefCallback<HTMLElement>} refCallback Ref callback.
 * @prop {boolean} isRequired Whether field is required.
 * @prop {HTMLElement?} element Element assigned by ref callback.
 */

/**
 * @typedef FormStepsProps
 *
 * @prop {FormStep[]=} steps Form steps.
 * @prop {Record<string,any>=} initialValues Form values to populate initial state.
 * @prop {FormStepError<Record<string,Error>>[]=} initialActiveErrors Errors to initialize state.
 * @prop {boolean=} autoFocus Whether to automatically focus heading on mount.
 * @prop {(values:Record<string,any>)=>void=} onComplete Form completion callback.
 */

/**
 * Returns the index of the step in the array which matches the given name. Returns `-1` if there is
 * no step found by that name.
 *
 * @param {FormStep[]} steps Form steps.
 * @param {string}     name  Step to search.
 *
 * @return {number} Step index.
 */
export function getStepIndexByName(steps, name) {
  return steps.findIndex((step) => step.name === name);
}

/**
 * Returns the first element matched to a field from a set of errors, if exists.
 *
 * @param {FormStepError<Record<string,Error>>[]} errors Active form step errors.
 * @param {Record<string,FieldsRefEntry>} fields Current fields.
 *
 * @return {HTMLElement=}
 */
function getFieldActiveErrorFieldElement(errors, fields) {
  const error = errors.find(({ field }) => fields[field]?.element);

  if (error) {
    return fields[error.field].element || undefined;
  }
}

function isPromise(value) {
  return typeof value?.then === 'function';
}

function trackPromiseValues(values) {
  Object.keys(values).forEach((key) => {
    const value = values[key];
    if (isPromise(value)) {
      trackPromise(value);
    }
  });
}

function hasPendingPromiseValue(values) {
  return Object.keys(values).some((key) => isPromisePending(values[key]));
}

/**
 * @param {FormStepsProps} props Props object.
 */
function FormSteps({
  steps = [],
  onComplete = () => {},
  initialValues = {},
  initialActiveErrors = [],
  autoFocus,
}) {
  const [values, setValues] = useState(initialValues);
  const [activeErrors, setActiveErrors] = useState(initialActiveErrors);
  const formRef = useRef(/** @type {?HTMLFormElement} */ (null));
  const headingRef = useRef(/** @type {?HTMLHeadingElement} */ (null));
  const [stepName, setStepName] = useHistoryParam('step', null);
  const { t } = useI18n();
  const fields = useRef(/** @type {Record<string,FieldsRefEntry>} */ ({}));
  const didSubmitWithErrors = useRef(false);
  const forceRender = useForceRender();
  useEffect(() => {
    if (activeErrors.length && didSubmitWithErrors.current) {
      getFieldActiveErrorFieldElement(activeErrors, fields.current)?.focus();
    }

    didSubmitWithErrors.current = false;
  }, [activeErrors]);

  const stepIndex = Math.max(getStepIndexByName(steps, stepName), 0);
  const step = steps[stepIndex];

  useEffect(() => {
    // Treat explicit initial step the same as step transition, placing focus to header.
    if (autoFocus && headingRef.current) {
      headingRef.current.focus();
    }
  }, []);

  /**
   * Returns array of form errors for the current set of values.
   *
   * @return {FormStepError<Record<string,Error>>[]}
   */
  function getValidationErrors() {
    return Object.keys(fields.current).reduce((result, key) => {
      const { element, isRequired } = fields.current[key];
      const isActive = !!element;

      if (isActive && isRequired && !values[key]) {
        result = result.concat({ field: key, error: new RequiredValueMissingError() });
      }

      return result;
    }, /** @type {FormStepError<Record<string,Error>>[]} */ ([]));
  }

  function onChange(nextValuesPatch) {
    setActiveErrors((prevActiveErrors) =>
      prevActiveErrors.filter(({ field }) => !(field in nextValuesPatch)),
    );
    setValues((prevValues) => ({ ...prevValues, ...nextValuesPatch }));
  }

  useEffect(() => {
    Object.keys(values).forEach((key) => {
      const value = values[key];
      if (isPromise(value)) {
        value.then((result) => {
          if (values[key] === value) {
            onChange({ [key]: result });
          }
        });
      }
    });
    trackPromiseValues(values);
  }, [values]);

  // An empty steps array is allowed, in which case there is nothing to render.
  if (!step) {
    return null;
  }

  const unknownFieldErrors = activeErrors.filter((error) => !fields.current[error.field]?.element);

  /**
   * Increments state to the next step, or calls onComplete callback if the current step is the last
   * step.
   *
   * @type {import('react').FormEventHandler}
   */
  function toNextStep(event) {
    event.preventDefault();

    if (hasPendingPromiseValue(values)) {
      // TBD: User feedback?
      return;
    }

    // Don't proceed if field errors have yet to be resolved.
    if (activeErrors.length && activeErrors.length > unknownFieldErrors.length) {
      setActiveErrors([...activeErrors]);
      didSubmitWithErrors.current = true;
      return;
    }

    const nextActiveErrors = getValidationErrors();
    setActiveErrors(nextActiveErrors);
    didSubmitWithErrors.current = true;
    if (nextActiveErrors.length) {
      return;
    }

    const nextStepIndex = stepIndex + 1;
    const isComplete = nextStepIndex === steps.length;
    if (isComplete) {
      // Clear step parameter from URL.
      setStepName(null);
      onComplete(values);
    } else {
      const { name: nextStepName } = steps[nextStepIndex];
      setStepName(nextStepName);
    }

    headingRef.current?.focus();
  }

  const { form: Form, footer: Footer, name, title } = step;
  const isLastStep = stepIndex + 1 === steps.length;

  return (
    <form ref={formRef} onSubmit={toNextStep}>
      {unknownFieldErrors.map(({ field, error }) => (
        <Alert
          key={[field, error.message].join()}
          type="error"
          className="margin-bottom-4 margin-top-2 tablet:margin-top-0"
        >
          <FormErrorMessage error={error} />
        </Alert>
      ))}
      <PageHeading key="title" ref={headingRef} tabIndex={-1}>
        {title}
      </PageHeading>
      <Form
        key={name}
        value={values}
        errors={activeErrors}
        onChange={onChange}
        registerField={(field, options = {}) => {
          if (!fields.current[field]) {
            fields.current[field] = {
              refCallback(fieldNode) {
                fields.current[field].element = fieldNode;

                if (activeErrors.length) {
                  forceRender();
                }
              },
              element: null,
              isRequired: !!options.isRequired,
            };
          }

          return fields.current[field].refCallback;
        }}
      />
      <Button type="submit" isPrimary className="margin-y-5">
        {t(isLastStep ? 'forms.buttons.submit.default' : 'forms.buttons.continue')}
      </Button>
      {Footer && <Footer />}
    </form>
  );
}

export default FormSteps;
