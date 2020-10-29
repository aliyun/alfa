import React from 'react';
import { storiesOf } from '@storybook/react';
import Basic from './demos/basic';
import WithConfig from './demos/withConfig';
import RemoteModule from './demos/RemoteModule';

storiesOf('Basic Console OS', module)
  .add('Basic Use', () => <Basic/>)
  .add('WithConfig', () => <WithConfig />)
  .add('RemoteModule', () => <RemoteModule />)