import React from 'react';
import { createAlfaWidget } from '../../src';

const AlfaWidget = createAlfaWidget({
  name: '@ali/alfa-cloud-home-widget-alfa-widget-demo',
  locale: 'en_US',
  delay: 6000,
  priority: 'low',
});

const Basic = () => {
  return (
    <div>
      <div style={{ height: '2000px', background: '#e5e5e5' }}>placeholder</div>
      <AlfaWidget />
    </div>
  );
};

export default Basic;
