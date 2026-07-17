<script setup lang="ts">
const stars = [
  { name: "太陽", tone: "major" },
  { name: "文昌", tone: "lucky" },
  { name: "鈴星", tone: "sha" },
  { name: "天月", tone: "misc" },
  { name: "胎", tone: "misc" },
  { name: "病符", tone: "misc" },
];
</script>

<template>
  <div class="transit-example-analysis">
    <h3>甲戌【夫妻宮】</h3>

    <div class="palace-overview">
      <section>
        <h4>宮內星曜</h4>
        <div class="star-tags">
          <span v-for="star in stars" :key="star.name" :class="star.tone">{{ star.name }}</span>
        </div>
      </section>
      <section class="age-summary">
        <h4>大限年齡</h4>
        <p>22 - 31 虛歲</p>
        <h4>小限年齡</h4>
        <p>10, 22, 34, 46,<br />58, 70, 82 虛歲</p>
      </section>
    </div>

    <hr />

    <section class="analysis-section">
      <h4>1. 大限與小限宮位對照舉例</h4>
      <h5>• 大限對應：22-31 歲大限命宮在戌宮為例</h5>
      <ol>
        <li>大限命宮 ➔ 本命夫妻宮（戌宮）：這十年的生活焦點受感情與人際關係主導。</li>
        <li>大限夫妻宮 ➔ 本命財帛宮（申宮）：這十年的感情婚姻，會與個人財務緊密關聯。</li>
        <li>大限財帛宮 ➔ 本命遷移宮（午宮）：這十年的金錢收入容易與出外、社交活動有關。</li>
      </ol>

      <h5>• 小限對應：虛歲 22 歲小限命宮在戌宮為例</h5>
      <ol>
        <li>小限命宮 ➔ 本命夫妻宮／大限命宮（戌宮）：該年的個人狀態與運勢起伏受這兩層宮位影響。</li>
        <li>小限夫妻宮 ➔ 本命財帛宮／大限夫妻宮（申宮）：該年的感情運勢深受大限與本命財務狀況的牽動。</li>
        <li>小限財帛宮 ➔ 本命遷移宮／大限財帛宮（午宮）：該年的財運與出外變動、公關人脈有關。</li>
      </ol>
    </section>

    <section class="analysis-section">
      <h4>2. 星曜變化與疊宮</h4>
      <h5>• 太陽星在夫妻宮的特性</h5>
      <p>
        太陽代表熱情、付出、照亮他人。落入「戌宮（夜晚）」時，太陽的光芒受限，代表在感情或合作關係中，命主容易處於默默奉獻、心有餘而力不足的狀態。
      </p>

      <h5>• 大小限疊宮分析（以 22 歲為例）</h5>
      <p>此時本命夫妻宮、大限命宮與小限命宮同時重疊於「戌宮」，並由太陽星主導：</p>
      <ol>
        <li>感情方面：這一年你會特別關注感情關係，容易為伴侶過度操勞、單方面付出，需要注意感情中的辛勞感。</li>
        <li>自我狀態：作為大限命宮與小限命宮，此時你的個人想法與行動力會圍繞著感情生活展開，常因感情而調整自己的人生意向。</li>
        <li>分析建議：在 22-31 歲這十年及特定的 22 歲這一年，不宜盲目付出，在關係中要保留自我，適度與伴侶理性溝通，避免過度透支自己的熱情。</li>
      </ol>
    </section>
  </div>
</template>

<style scoped>
.transit-example-analysis {
  padding-top: 8px;
  color: rgba(36, 87, 90, 0.8);
}
.transit-example-analysis > h3 {
  margin: 0 0 12px;
  color: var(--cinnabar);
  font-size: 16px;
  font-weight: 900;
}
.palace-overview {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 16px;
}
.palace-overview h4,
.analysis-section h4,
.analysis-section h5 {
  margin: 0;
  color: var(--mountain);
}
.palace-overview h4 {
  font-size: 14px;
  font-weight: 800;
}
.star-tags {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 68px));
  gap: 8px;
  margin-top: 8px;
}
.star-tags span {
  display: grid;
  place-items: center;
  width: 100%;
  height: 28px;
  border: 1.5px solid currentColor;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 800;
}
.star-tags .major {
  background: rgba(184, 91, 75, 0.1);
  color: var(--cinnabar);
}
.star-tags .lucky {
  background: rgba(107, 166, 160, 0.1);
  color: var(--jade);
}
.star-tags .sha {
  background: rgba(128, 74, 151, 0.1);
  color: #804a97;
}
.star-tags .misc {
  background: rgba(36, 87, 90, 0.07);
  color: rgba(36, 87, 90, 0.64);
}
.age-summary p {
  margin: 4px 0 12px;
  color: var(--mountain);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
}
.transit-example-analysis hr {
  margin: 16px 0;
  border: 0;
  border-top: 1px solid rgba(36, 87, 90, 0.12);
}
.analysis-section + .analysis-section {
  margin-top: 16px;
}
.analysis-section h4 {
  font-size: 16px;
  font-weight: 900;
}
.analysis-section h5 {
  margin-top: 8px;
  font-size: 14.5px;
  font-weight: 800;
  line-height: 1.5;
}
.analysis-section p,
.analysis-section ol {
  margin: 4px 0 12px;
  font-size: 14.5px;
  font-weight: 500;
  line-height: 1.55;
}
.analysis-section ol {
  padding-left: 22px;
}
.analysis-section li + li {
  margin-top: 5px;
}
.analysis-section li::marker {
  color: var(--jade);
  font-weight: 800;
}

@media (max-width: 390px) {
  .palace-overview {
    grid-template-columns: minmax(0, 1fr) 120px;
    gap: 10px;
  }
  .star-tags {
    gap: 6px;
  }
  .age-summary p,
  .analysis-section p,
  .analysis-section ol {
    font-size: 13px;
  }
}
</style>
