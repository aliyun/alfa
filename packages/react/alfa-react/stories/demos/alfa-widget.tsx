import React, { useEffect, useState } from 'react';
import { createAlfaWidget } from '../../src';

const AlfaWidget = createAlfaWidget({
  name: '@ali/alfa-cloud-home-widget-alfa-widget-demo',
  locale: 'en_US',
  loading: false,
  // dynamicConfig: true,
});

const Wrapper = (props) => {
  return <AlfaWidget {...props} />
}

const Basic: React.FC<{}> = () => {
  const [visible, setVisible] = useState(true);

  return (
    <div>
      <button onClick={() => setVisible(!visible)}>btn</button>
      {
        visible ? <Wrapper a={Date.now()} test={() => {}} /> : null
      }
    </div>
  );
};

export default Basic;
