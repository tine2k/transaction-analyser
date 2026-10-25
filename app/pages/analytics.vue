<script setup lang="ts">
// The Analytics screen became the Monthly screen. Keep the old path working for
// existing links and bookmarks.
// See openspec/changes/replace-analytics-with-monthly-screen/design.md D2.
definePageMeta({ redirect: '/monthly' });
</script>
