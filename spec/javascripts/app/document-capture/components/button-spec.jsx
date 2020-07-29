import React from 'react';
import sinon from 'sinon';
import userEvent from '@testing-library/user-event';
import render from '../../../support/render';
import Button from '../../../../../app/javascript/app/document-capture/components/button';

describe('document-capture/components/button', () => {
  it('renders with default props', () => {
    const { getByText } = render(<Button>Click me</Button>);

    const button = getByText('Click me');
    userEvent.click(button);

    expect(button.nodeName).to.equal('BUTTON');
    expect(button.type).to.equal('button');
    expect(button.classList.contains('btn')).to.be.true();
    expect(button.classList.contains('btn-primary')).to.be.false();
    expect(button.classList.contains('btn-wide')).to.be.false();
  });

  it('calls click callback with no arguments', () => {
    const onClick = sinon.spy();
    const { getByText } = render(<Button onClick={onClick}>Click me</Button>);

    const button = getByText('Click me');
    userEvent.click(button);

    expect(onClick.calledOnce).to.be.true();
    expect(onClick.getCall(0).args).to.deep.equal([]);
  });

  it('renders as primary', () => {
    const { getByText } = render(<Button isPrimary>Click me</Button>);

    const button = getByText('Click me');

    expect(button.classList.contains('btn-primary')).to.be.true();
    expect(button.classList.contains('btn-wide')).to.be.true();
  });

  it('renders as disabled', () => {
    const onClick = sinon.spy();
    const { getByText } = render(
      <Button isDisabled onClick={onClick}>
        Click me
      </Button>,
    );

    const button = getByText('Click me');
    userEvent.click(button);

    expect(onClick.calledOnce).to.be.false();
    expect(button.disabled).to.be.true();
  });

  it('renders with custom type', () => {
    const { getByText } = render(<Button type="submit">Click me</Button>);

    const button = getByText('Click me');

    expect(button.type).to.equal('submit');
  });

  it('renders with custom class names', () => {
    const { getByText } = render(<Button className="my-button">Click me</Button>);

    const button = getByText('Click me');

    expect(button.classList.contains('my-button')).to.be.true();
  });
});