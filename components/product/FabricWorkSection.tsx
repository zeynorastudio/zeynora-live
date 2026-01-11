// FabricWorkSection: Fabric and work details section
// DB Sources:
//   - products.fabric_type (text)
//   - products.fabric_weight (text)
//   - products.origin (text)
//   - products.care_instructions (text)
//   - products.work_type (text)
//   - products.work_detail (text)
//   - products.work_coverage (text)
//   - products.technique (text)
// Structure-only: Display only, no logic

export default function FabricWorkSection() {
  // Placeholder values - DB: products table
  const fabricDetails = {
    fabricType: "Silk", // DB: products.fabric_type
    fabricWeight: "Lightweight", // DB: products.fabric_weight
    origin: "India", // DB: products.origin
    careInstructions: "Dry clean only", // DB: products.care_instructions
  };

  const workDetails = {
    workType: "Handwoven", // DB: products.work_type
    workDetail: "Intricate patterns", // DB: products.work_detail
    workCoverage: "Full coverage", // DB: products.work_coverage
    technique: "Traditional handloom", // DB: products.technique
  };

  return (
    <div className="pt-6 editorial-divider section-gap-md">
      {/* Desktop: 2-column grid, Mobile: Stacked */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        {/* Details Column */}
        <div>
          <h3 className="serif-display text-lg text-night mb-4">Details</h3>
          <dl className="space-y-3">
            {/* Fabric Type - DB: products.fabric_type */}
            <div>
              <dt className="sans-base text-xs text-silver-dark mb-1">
                Fabric Type
              </dt>
              <dd className="sans-base text-sm text-night">
                {fabricDetails.fabricType}
              </dd>
            </div>

            {/* Fabric Weight - DB: products.fabric_weight */}
            <div>
              <dt className="sans-base text-xs text-silver-dark mb-1">
                Fabric Weight
              </dt>
              <dd className="sans-base text-sm text-night">
                {fabricDetails.fabricWeight}
              </dd>
            </div>

            {/* Origin - DB: products.origin */}
            <div>
              <dt className="sans-base text-xs text-silver-dark mb-1">
                Origin
              </dt>
              <dd className="sans-base text-sm text-night">
                {fabricDetails.origin}
              </dd>
            </div>

            {/* Care Instructions - DB: products.care_instructions */}
            <div>
              <dt className="sans-base text-xs text-silver-dark mb-1">
                Care Instructions
              </dt>
              <dd className="sans-base text-sm text-night">
                {fabricDetails.careInstructions}
              </dd>
            </div>
          </dl>
        </div>

        {/* Work & Embellishment Column */}
        <div>
          <h3 className="serif-display text-lg text-night mb-4">
            Work & Embellishment
          </h3>
          <dl className="space-y-3">
            {/* Work Type - DB: products.work_type */}
            <div>
              <dt className="sans-base text-xs text-silver-dark mb-1">
                Work Type
              </dt>
              <dd className="sans-base text-sm text-night">
                {workDetails.workType}
              </dd>
            </div>

            {/* Work Detail - DB: products.work_detail */}
            <div>
              <dt className="sans-base text-xs text-silver-dark mb-1">
                Work Detail
              </dt>
              <dd className="sans-base text-sm text-night">
                {workDetails.workDetail}
              </dd>
            </div>

            {/* Work Coverage - DB: products.work_coverage */}
            <div>
              <dt className="sans-base text-xs text-silver-dark mb-1">
                Work Coverage
              </dt>
              <dd className="sans-base text-sm text-night">
                {workDetails.workCoverage}
              </dd>
            </div>

            {/* Technique - DB: products.technique */}
            <div>
              <dt className="sans-base text-xs text-silver-dark mb-1">
                Technique
              </dt>
              <dd className="sans-base text-sm text-night">
                {workDetails.technique}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
