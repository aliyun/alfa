import React from 'react';
import { createAlfaWidget, addGlobalRequestInterceptor } from '../../src';

const AlfaWidget = createAlfaWidget({
  name: '@ali/alfa-cloud-home-widget-alfa-widget-demo',
  locale: 'en_US',
  // delay: 6000,
  priority: 'low',
  // dynamicConfig: true,
});

addGlobalRequestInterceptor((config) => {
  console.info(config);

  return config;
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
