# Playwright Component Testing for Angular _(experimental)_

This library brings **Angular support** to [Playwright's **experimental
** Component Testing](https://playwright.dev/docs/test-components).

This will allow you to test your Angular components with Playwright without building the whole app and with more
control.

`@jscutlery/playwright-ct-angular` currently supports:

- ✅ **Testing Angular components/directives/pipes**
- 🎛 **Controlling inputs/outputs in a type-safe fashion**
- 🥸 **Overriding providers**
- 🍳 **Testing with templates**

https://user-images.githubusercontent.com/2674658/206226065-ba856329-dda7-43b1-9c28-4416b190f4d4.mp4

# Table of Contents

<!-- TOC -->

* [Playwright Component Testing for Angular _(experimental)_](#playwright-component-testing-for-angular-_experimental_)
* [Table of Contents](#table-of-contents)
* [🚀 Writing your first test](#-writing-your-first-test)
    * [✅ Basic Test](#-basic-test)
    * [🎛 Testing Inputs](#-testing-inputs)
        * [Passing output callbacks](#passing-output-callbacks)
    * [🥸 Providing Test Doubles & Importing Additional Modules](#-providing-test-doubles--importing-additional-modules)
    * [🎨 Using Styles](#-using-styles)
        * [Shared Styles](#shared-styles)
        * [Specific Styles](#specific-styles)
        * [Angular Material & Angular Libraries with styles](#angular-material--angular-libraries-with-styles)
    * [More examples](#more-examples)
* [⚠️ Known Limitations](#-known-limitations)
    * [🪄 The Magic Behind the Scenes](#-the-magic-behind-the-scenes)
    * [It is currently impossible to...](#it-is-currently-impossible-to)
        * [...hold the component type in a variable](#hold-the-component-type-in-a-variable)
        * [...use the component type elsewhere in the file.](#use-the-component-type-elsewhere-in-the-file)
        * [...declare components in the same file.](#declare-components-in-the-same-file)
* [📦 Setup](#-setup)
    * [1. Install](#1-install)
    * [2. Configure](#2-configure)
    * [3. Change tests extension](#3-change-tests-extension)

<!-- TOC -->

# 🚀 Writing your first test

First, you will have to set up Playwright Component Testing as [mentioned below](#setup).

⚠️ Make sure to check the [known limitations](#%EF%B8%8F-known-limitations) before writing more tests.

## ✅ Basic Test

Then, you can write your first test in `.../src/greetings.component.pw.ts`:

```ts
import { expect, test } from '@jscutlery/playwright-ct-angular';
import { GreetingsComponent } from './greetings.component';

test(`GreetingsComponent should be polite`, async ({ mount }) => {
  const locator = await mount(GreetingsComponent);
  expect(locator).toHaveText('👋 Hello!');
});
```

## 🎛 Testing Inputs

```ts
import { expect, test } from '@jscutlery/playwright-ct-angular';
import { GreetingsComponent } from './greetings.component';

test(`GreetingsComponent should be polite`, async ({ mount }) => {
  const locator = await mount(GreetingsComponent, { props: { name: 'Edouard' } });
  expect(locator).toHaveText('👋 Hello Edouard!');
});
```

### Passing output callbacks

You can also pass custom output callback functions for some extreme cases or if you want to use a custom spy
implementation for example or just debug.

```ts
await mount(NameEditorComponent, {
  on: {
    nameChange(name) {
      console.log(name);
    }
  }
});
```

## 🥸 Providing Test Doubles & Importing Additional Modules

Due to the [limitations described below](#-known-limitations), the recommended approach for providing test doubles
or importing additional modules is to create a test container component in another file.

```ts
// recipe-search.component.pw.ts
import { defer } from 'rxjs';
import { RecipeSearchTestContainer } from './recipe-search.test-container';

test('...', async ({ mount }) => {
  await mount(RecipeSearchTestContainer, {
    props: {
      recipes: [
        beer,
        burger
      ]
    }
  })
})

// recipe-search.test-container.ts
@Component({
  standalone: true,
  imports: [RecipeSearchComponent],
  template: '<jc-recipe-search></jc-recipe-search>',
  providers: [
    RecipeRepositoryFake,
    {
      provide: RecipeRepository,
      useExisting: RecipeRepositoryFake,
    },
  ],
})
export class RecipeSearchTestContainer {
  recipes = input<Recipe[]>([]);
  #repo = inject(RecipeRepositoryFake);
  #syncRecipesWithRepo = effect(() => {
    this.#repo.setRecipes(this.recipes());
  });
}

/* Cf. https://github.com/jscutlery/devkit/tree/main/tests/playwright-ct-angular-wide/src/testing/recipe-repository.fake.ts
 * for a better example. */
class RecipeRepositoryFake implements RecipeRepositoryDef {
  #recipes: Recipe[] = [];

  searchRecipes() {
    return defer(() => of(this.#recipes));
  }

  setRecipes(recipes: Recipe[]) {
    this.#recipes = recipes;
  }
}
```

## 🎨 Using Styles

### Shared Styles

In order to import styles that are shared between your tests, you can do so by importing them in `playwright/index.ts`.
You can also customize the shared `playwright/index.html` nearby.

### Specific Styles

If you want to load some specific styles for a single test, you might prefer using a test container component:

```ts
import styles from './some-styles.css';

@Component({
  template: '<jc-greetings></jc-greetings>',
  encapsulation: ViewEncapsulation.None,
  styles: [styles]
})
class GreetingsTestContainer {
}
```

### Angular Material & Angular Libraries with styles

As mentioned in [Versatile Angular Style Blog Post](https://marmicode.io/blog/versatile-angular),
Angular Material and other Angular libraries might use
a [Conditional "style" Export](https://nodejs.org/api/packages.html#conditional-exports)
that allows us to import prebuilt styles
_(
Cf. [Angular Package Format](https://angular.io/guide/angular-package-format) [managing assets in a library](https://angular.io/guide/creating-libraries#managing-assets-in-a-library))_.

In that case, we can add the following configuration to our `playwright-ct.config.ts`:

```ts
const config: PlaywrightTestConfig = {
  // ...
  use: {
    // ...
    ctViteConfig: {
      resolve: {
        /* @angular/material is using "style" as a Custom Conditional export to expose prebuilt styles etc... */
        conditions: ['style']
      }
    }
  }
};
```

## More examples

Cf. [/tests/playwright-ct-angular-demo/src](https://github.com/jscutlery/devkit/tree/main/tests/playwright-ct-angular-demo/src)

# ⚠️ Known Limitations

The way Playwright Component Testing works is different from the way things work with Karma, Jest, Vitest, Cypress
etc...
Playwright Component Testing tests run in a Node.js environment and control the browser through Chrome DevTools
Protocol, while the component is rendered in a browser.

This causes a couple of limitations as we can't directly access the `TestBed`'s or the component's internals,
and **we can only exchange serializable data with the component**.

## It is not possible to hold the component type in a variable

```ts
// 🛑 this won't work
const cmp = MyComponent;
await mount(cmp);
```

### It is not possible to use the component type elsewhere in the file.

```ts
// 🛑 this won't work
test(MyComponent.name, async ({ mount }) => {
});
```

### It is not possible to declare components in the same file.

```ts
// 🛑 this won't work
@Component({ ... })
class GreetingsComponent {
}

test('should work', async ({ mount }) => {
  await mount(GreetingsComponent);
});
```

### It is not possible to use anything in providers which is not serializable or "importable".

```ts
import { provideAnimations } from '@angular/platform-browser/animations';
import { MY_PROVIDERS } from './my-providers';
import { MyFake } from './my-fake';

@Injectable()
class MyLocalFake {
  // ...
}

// 🛑 this won't work because the result of `provideAnimations()` is not serializable
mount(GreetingsComponent, { providers: [provideAnimations()] })
// 🛑 this won't work because `MyLocalFake` is not "importable"
mount(GreetingsComponent, { providers: [{ provide: MyService, useClass: MyLocalFake }] })
// ✅ this works
mount(GreetingsComponent, { providers: MY_PROVIDERS });
// ✅ this works
mount(GreetingsComponent, { providers: [{ provide: MY_VALUE, useValue: 'my-value' }] });
// ✅ this works
mount(GreetingsComponent, { providers: [{ provide: MyService, useClass: MyFake }] });
```

## 🪄 The Magic Behind the Scenes

The magical workaround behind the scenes is that at build time:

1. Playwright analyses all the calls to `mount()`,
2. it grabs the arguments (e.g. the component class),
3. replaces the component class with a unique string (constructed from the component class name and es-module),
4. adds the component's ES module to Vite entrypoints,
5. and finally creates a map matching each unique string to the right ES module.

This way, when calling `mount()`, Playwright will communicate the unique string to the browser who will know which
ES module to load.

Cf. https://youtu.be/y3YxX4sFJbM

Cf. https://github.com/microsoft/playwright/blob/cac67fb94f2c8a0ee82878054c39790e660f17ca/packages/playwright-test/src/tsxTransform.ts#L153

###                  

# 📦 Setup

### 1. Install

```sh
# You can run this command in an existing workspace.
npm create playwright -- --ct

# Choose React

# ? Which framework do you use? (experimental) … 
# ❯ react
#  vue
#  svelte
#  solid

npm add -D @jscutlery/playwright-ct-angular @jscutlery/swc-angular unplugin-swc
npm uninstall -D @playwright/experimental-ct-react
```

### 2. Configure

- Update `playwright-ct.config.ts` and replace:

```ts
import { defineConfig, devices } from '@playwright/experimental-ct-react';
```

with

```ts
import { defineConfig, devices } from '@jscutlery/playwright-ct-angular';
import { swcAngularUnpluginOptions } from '@jscutlery/swc-angular'
import swc from 'unplugin-swc';
```

- Configure vite plugin:

```ts
export default defineConfig({
  use: {
    // ...
    ctViteConfig: {
      // ...
      plugins: [
        swc.vite(swcAngularUnpluginOptions())
      ]
    }
  }
});
```

### 3. Change tests extension

In order to avoid collisions with other tests (e.g. Jest / Vitest),
You can replace the default matching extension `.spec.ts` with `.pw.ts`:

```ts
const config: PlaywrightTestConfig = {
  testDir: './',
  testMatch: /pw\.ts$/,
  ...
}
```

### 4. Choose between zoneful or zoneless testing

#### Zoneful Testing

If you want to use zoneful testing, you have to import `zone.js` in your `playwright/index.ts`:

```ts
// playwright/index.ts
import 'zone.js';
```

#### Zoneless Testing

For zoneless testing, you have to provide `provideExperimentalZonelessChangeDetection()` in your `playwright/index.ts`:

```ts
// playwright/index.ts
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { beforeMount } from '@jscutlery/playwright-ct-angular/hooks';

beforeMount(async ({ TestBed }) => {
  TestBed.configureTestingModule({
    providers: [
      provideExperimentalZonelessChangeDetection(),
    ],
  });
});
```

Cf. [Zoneless Example's `playwright/index.ts`](../../tests/playwright-ct-angular-demo/playwright/index.ts)
