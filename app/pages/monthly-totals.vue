<script setup lang="ts">
// The Monthly totals screen became the Yearly screen. Keep the old path working
// for existing links and bookmarks, including any person filter in the query.
// See openspec/changes/replace-monthly-totals-with-yearly-screen/design.md D2.
definePageMeta({
  redirect: (to) => ({ path: '/yearly', query: to.query }),
});
</script>
