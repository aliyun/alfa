import React from 'react';
import { createAlfaWidget } from '../../src';

const AlfaApp = createAlfaWidget({
  name: '@ali/alfa-cloud-ram-widget-permission',
  locale: 'en_US',
  // dynamicConfig: true,
});

const Basic: React.FC<{}> = () => {
  return (
    <AlfaApp />
  );
};

export default Basic;
