import React from 'react';
import { storiesOf } from '@storybook/react';

import Basic from './demos/basic';
import Manifest from './demos/manifest';
import AlfaWidget from './demos/alfa-widget';
import CWSWidget from './demos/cws-widget';
import LazyWidget from './demos/lazyload';

storiesOf('Basic Console OS', module)
  .add('Basic Use', () => <Basic />)
  .add('Manifest', () => <Manifest />)
  .add('AlfaWidget', () => <AlfaWidget />)
  .add('CWSWidget', () => <CWSWidget />)
  .add('LazyLoad', () => <LazyWidget />);
