<script setup lang="ts">

import PDFTools from './components/PDFTools.vue';

</script>

<template>
  <div class="main">
    <PDFTools class="pdf-tools" />
  </div>

</template>

<style scoped>
.main {
  width: 100vw;
  height: 100vh;
}

.pdf-tools {
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: auto;
}

.topbar {
  position: sticky;
  top: 0;
  width: 100%;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: right;
}
</style>
