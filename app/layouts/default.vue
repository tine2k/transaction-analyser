<script setup lang="ts">
// The one layout every route renders in. Beyond the shared document metadata and the
// page frame it carries the menu bar through which the screens are reached: the
// transactions screen, the three analysis screens, and the manage hub. The manage
// hub reaches the category, people, and import screens; the transactions screen also
// carries its own category-management link.
//
// One list holds every named route, so a route keeps its tab title even when it is
// not a bar destination. Only entries flagged for the bar render as pills. The bar
// marks Manage as the current destination on the hub and on the screens the hub
// contains; the exact screen is named by its heading and tab title.
//
// The masthead's inner content and the main frame span the viewport at every width:
// padding, not a centered maximum-width column, keeps content off the edge. Screens
// that need a readable measure bound their own forms rather than the shared frame.
//
// The frame also owns the phone's safe areas: the brand bar paints the top inset,
// the header and main inset their content from a landscape notch, and main clears
// the home indicator. A browser tab supplies zero insets, leaving the existing
// phone and desktop padding unchanged.
//
// See openspec/changes/reorganise-navigation/specs/frontend-shell/spec.md
// and openspec/changes/reorganise-navigation/specs/manage-hub/spec.md
// and openspec/changes/remove-mobile-top-white-band/design.md D4-D6.
import { IconMenu2, IconX } from '@tabler/icons-vue';

type Screen = {
  to: string;
  label: string;
  inBar: boolean;
  section?: 'manage';
};

const route = useRoute();
const mobileNavOpen = ref(false);

// The route list names every screen for the tab and decides which five appear as
// bar pills. Categories, People, and Imports are reached through the Transactions
// screen and the manage hub rather than as bar peers.
const screens: Screen[] = [
  { to: '/', label: 'Transactions', inBar: true },
  { to: '/categories', label: 'Categories', inBar: false, section: 'manage' },
  { to: '/people', label: 'People', inBar: false, section: 'manage' },
  { to: '/monthly', label: 'Monthly', inBar: true },
  { to: '/yearly', label: 'Yearly', inBar: true },
  { to: '/monthly-average', label: 'Monthly average', inBar: true },
  { to: '/imports', label: 'Imports', inBar: false, section: 'manage' },
  { to: '/manage', label: 'Manage', inBar: true, section: 'manage' },
];

const navigation = screens.filter((screen) => screen.inBar);
const currentScreen = computed(() => screens.find(({ to }) => to === route.path));

// The tab title takes the screen's name from the same list the menu is built from, so
// the two cannot drift: a route added to the list is named in the tab as well. A path
// no screen matches shows the application name alone.
// See openspec/changes/add-application-icon-and-name/design.md D5.
const screenLabel = computed(() => currentScreen.value?.label);

useHead({
  htmlAttrs: { lang: 'en' },
  title: computed(() => (screenLabel.value === undefined ? 'Expenses' : `${screenLabel.value} · Expenses`)),
  meta: [{ name: 'description', content: 'Reads transactions from a bank export.' }],
});

function isCurrent(screen: Screen): boolean {
  if (route.path === screen.to) {
    return true;
  }
  return screen.section === 'manage' && currentScreen.value?.section === 'manage';
}

// The hub is the current page on /manage and the current section on the screens it
// contains, so the markup distinguishes the two cases.
function ariaCurrent(screen: Screen): 'page' | 'true' | undefined {
  if (route.path === screen.to) {
    return 'page';
  }
  if (screen.section === 'manage' && currentScreen.value?.section === 'manage') {
    return 'true';
  }
  return undefined;
}

watch(() => route.path, () => {
  mobileNavOpen.value = false;
});
</script>

<template>
  <div class="min-h-screen text-ink">
    <header class="brand-bar">
      <div class="frame-safe-inline px-4 pb-3 pt-3.5 sm:px-10 sm:py-3.5">
        <div class="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-start md:gap-6">
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-2.5">
              <AppLogo :size="30" />
              <p class="font-display text-xl font-extrabold tracking-normal text-white md:tracking-[-0.02em]">
                Expenses
              </p>
            </div>
            <button
              type="button"
              class="inline-flex size-11 items-center justify-center rounded-sheet border border-white/40 bg-white/10 text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:hidden"
              data-testid="mobile-navigation-toggle"
              aria-controls="screen-navigation"
              :aria-expanded="mobileNavOpen"
              :aria-label="mobileNavOpen ? 'Close screen navigation' : 'Open screen navigation'"
              @click="mobileNavOpen = !mobileNavOpen"
            >
              <AppIcon :icon="mobileNavOpen ? IconX : IconMenu2" />
            </button>
          </div>
          <nav
            id="screen-navigation"
            aria-label="Screens"
            class="flex-col gap-1 md:flex md:flex-row md:flex-wrap md:items-center md:justify-start md:gap-1"
            :class="mobileNavOpen ? 'flex' : 'hidden md:flex'"
          >
            <NuxtLink
              v-for="screen in navigation"
              :key="screen.to"
              :to="screen.to"
              :aria-current="ariaCurrent(screen)"
              class="inline-flex min-h-12 items-center rounded-control px-4 py-2 text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 md:min-h-10 md:rounded-pill md:py-2.5 md:text-sm"
              :class="
                isCurrent(screen)
                  ? 'bg-surface text-brand-bar-from focus-visible:outline-white'
                  : 'bg-white/10 text-white hover:bg-white/20 focus-visible:outline-white'
              "
              @click="mobileNavOpen = false"
            >
              {{ screen.label }}
            </NuxtLink>
          </nav>
        </div>
      </div>
    </header>

    <main class="frame-safe-inline frame-safe-bottom w-full min-w-0 px-4 py-5 pb-8 sm:px-10 sm:py-8 sm:pb-16">
      <slot />
    </main>
  </div>
</template>
