import '@angular/compiler';
import 'zone.js';
import { getTestBed, TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Subscription } from 'rxjs';

const _componentLoaderMap = new Map();

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting()
);

/**
 * This is the function used by Playwright CT to map each component to its symbol.
 * The key here is a slug generated by Playwright CT based on the component's module path + component's name.
 */
export function pwRegister(components) {
  for (const [name, value] of Object.entries(components)) {
    _componentLoaderMap.set(name, value);
  }
}

/**
 * Container subscription holding all outputs subscription
 * in order to unsubscribe when component is unmounted.
 */
let subscription;

globalThis.playwrightMount = async (component, rootElement, hooksConfig) => {
  const cmpType = component.type;

  subscription = new Subscription();

  TestBed.configureTestingModule({
    imports: [BrowserAnimationsModule]
  });
  const fixture = TestBed.createComponent(cmpType);
  fixture.nativeElement.id = 'root';

  /* Set inputs. */
  for (const [name, value] of Object.entries(component.props ?? {})) {
    fixture.componentRef.setInput(name, value);
  }

  /* Subscribe to outputs. */
  for (const [name, callback] of Object.entries(
    component.on ?? {}
  )) {
    subscription.add(fixture.componentInstance[name].subscribe(callback));
  }

  fixture.autoDetectChanges();
  await fixture.whenStable();
};

globalThis.playwrightUnmount = async (rootElement) => {
  subscription.unsubscribe();
  subscription = null;
  getTestBed().resetTestingModule();
};

globalThis.playwrightUpdate = async (rootElement, component) => {
  rootElement.innerHTML = component;
};
