const mongoose = require("mongoose");

const SegmentSchema = new mongoose.Schema({
  startPoint:        { type: { type: String, enum: ["Point"], default: "Point" }, coordinates: [Number] },
  endPoint:          { type: { type: String, enum: ["Point"], default: "Point" }, coordinates: [Number] },
  distance:          Number,       // metres
  surface:           { type: String, enum: ["asphalt","concrete","gravel","dirt","tiles","unknown"], default: "unknown" },
  slope:             Number,       // degrees
  width:             Number,       // metres
  accessibilityScore:{ type: Number, default: 70 },
  obstacles:         [{ type: mongoose.Schema.Types.ObjectId, ref: "Report" }]
});

const RouteSchema = new mongoose.Schema(
  {
    // ── Path ──────────────────────────────────────────────
    origin: {
      name:        String,
      location:    { type: { type: String, enum: ["Point"], default: "Point" }, coordinates: [Number] }
    },
    destination: {
      name:        String,
      location:    { type: { type: String, enum: ["Point"], default: "Point" }, coordinates: [Number] }
    },

    // ── Route line (GeoJSON LineString) ───────────────────
    path: {
      type:        { type: String, enum: ["LineString"], default: "LineString" },
      coordinates: [[Number]]   // array of [lng, lat]
    },

    segments:         [SegmentSchema],

    // ── Metrics ───────────────────────────────────────────
    totalDistance:    Number,   // metres
    estimatedTime:    Number,   // seconds (at ~4 km/h wheelchair speed)
    elevationGain:    Number,   // metres
    accessibilityScore:{ type: Number, default: 70 },   // 0-100
    routeType:        { type: String, enum: ["safest","balanced","fastest"], default: "balanced" },

    // ── Obstacles on this route ───────────────────────────
    activeObstacles:  [{ type: mongoose.Schema.Types.ObjectId, ref: "Report" }],
    obstacleCount:    { type: Number, default: 0 },

    // ── Metadata ──────────────────────────────────────────
    savedBy:   [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    usageCount:{ type: Number, default: 0 },
    city:      String
  },
  { timestamps: true }
);

RouteSchema.index({ "origin.location": "2dsphere" });
RouteSchema.index({ "destination.location": "2dsphere" });
RouteSchema.index({ accessibilityScore: -1 });

module.exports = mongoose.model("Route", RouteSchema);
