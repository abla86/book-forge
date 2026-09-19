import React from 'react';
import {
  CheckCircle2,
  XCircle,
  TrendingUp,
  Award,
  Zap,
  DollarSign,
  Users,
  Target,
  Clock,
  Sparkles,
  Check,
} from 'lucide-react';
import { Slide, ThemeName, PresentationPlan } from '../types';
import { THEMES } from '../data/themes';

interface CleanSlideViewProps {
  slide: Slide;
  slideIndex: number;
  totalSlides: number;
  themeName: ThemeName;
  deckTitle: string;
  width?: number;
  height?: number;
  className?: string;
  id?: string;
}

export const CleanSlideView: React.FC<CleanSlideViewProps> = ({
  slide,
  slideIndex,
  totalSlides,
  themeName,
  deckTitle,
  width,
  height,
  className = '',
  id,
}) => {
  const theme = THEMES[themeName] || THEMES.startup;
  const bgStyle = slide.metadata?.backgroundStyle || 'mesh';
  const visualAsset = slide.metadata?.visualAsset || slide.content.visualAsset;

  return (
    <div
      id={id}
      className={`w-full aspect-[16/9] overflow-hidden relative select-none flex flex-col justify-between p-8 sm:p-12 md:p-14 ${className}`}
      style={{
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : 'auto',
        backgroundColor: theme.bg,
        borderColor: theme.cardBorder,
        color: theme.textPrimary,
        fontFamily: theme.fontFamily,
        boxSizing: 'border-box',
      }}
    >
      {/* Background Decorative Overlays */}
      {bgStyle === 'mesh' && (
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: theme.primary }}
        />
      )}
      {bgStyle === 'dots' && (
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(${theme.textPrimary} 1.5px, transparent 1.5px)`,
            backgroundSize: '24px 24px',
          }}
        />
      )}
      {bgStyle === 'gradient' && (
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${theme.primary} 0%, transparent 60%)`,
          }}
        />
      )}

      {/* AI Visual Background Layer (Photographic or Generative) */}
      {visualAsset && visualAsset.placement === 'hero_background' && (
        <div
          className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
          style={{
            opacity: visualAsset.opacity ?? 0.25,
            filter: visualAsset.blur ? `blur(${visualAsset.blur}px)` : 'none',
          }}
        >
          <img
            src={visualAsset.url}
            alt={visualAsset.alt || 'Slide backdrop'}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          {/* Gradient Contrast Mask ensuring typography remains crystal clear */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to right, ${theme.bg} 35%, transparent 100%)`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to top, ${theme.bg} 20%, transparent 80%)`,
            }}
          />
        </div>
      )}

      {/* Decorative Top Accent Bar */}
      <div
        className="absolute top-0 left-0 right-0 h-2"
        style={{ backgroundColor: theme.primary }}
      />

      {/* Slide Header (Badge, Headline, Subheadline) */}
      <div className="relative z-10 shrink-0">
        {slide.layout !== 'centered_hero' && (
          <div className="mb-2">
            <span
              className="text-xs sm:text-sm font-extrabold tracking-wider uppercase px-3 py-1 rounded-md inline-block"
              style={{
                backgroundColor: `${theme.primary}25`,
                color: theme.accent,
                border: `1px solid ${theme.primary}40`,
              }}
            >
              {slide.content.badge || `0${slideIndex + 1}`}
            </span>
          </div>
        )}

        {slide.layout !== 'centered_hero' && (
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight"
            style={{ color: theme.textPrimary }}
          >
            {slide.content.headline}
          </h2>
        )}

        {slide.layout !== 'centered_hero' && slide.content.subheadline && (
          <p
            className="text-sm sm:text-base md:text-lg mt-1 font-normal opacity-90 max-w-4xl leading-relaxed"
            style={{ color: theme.textSecondary }}
          >
            {slide.content.subheadline}
          </p>
        )}
      </div>

      {/* Slide Body Content */}
      <div className="my-auto py-2 relative z-10 w-full">
        {/* 1. Centered Hero */}
        {slide.layout === 'centered_hero' && (
          <div className="text-center max-w-4xl mx-auto space-y-4">
            <span
              className="text-xs sm:text-sm font-extrabold tracking-widest uppercase px-3.5 py-1.5 rounded-full inline-block"
              style={{
                backgroundColor: `${theme.primary}25`,
                color: theme.accent,
                border: `1px solid ${theme.primary}40`,
              }}
            >
              {slide.content.badge || 'EXECUTIVE SUMMARY'}
            </span>
            <h1
              className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight"
              style={{ color: theme.textPrimary }}
            >
              {slide.content.headline}
            </h1>
            {slide.content.subheadline && (
              <p
                className="text-base sm:text-xl font-normal leading-relaxed opacity-90 max-w-2xl mx-auto"
                style={{ color: theme.textSecondary }}
              >
                {slide.content.subheadline}
              </p>
            )}
            {slide.content.ctaAction?.primaryText && (
              <div className="pt-2">
                <span
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm sm:text-base text-white shadow-lg"
                  style={{ backgroundColor: theme.primary }}
                >
                  {slide.content.ctaAction.primaryText}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 2. 2x2 Grid (quad_grid) */}
        {slide.layout === 'quad_grid' && (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 w-full">
            {(slide.content.bulletPoints || []).map((bp, idx) => {
              const parts = bp.includes(':')
                ? [bp.split(':')[0], bp.split(':').slice(1).join(':').trim()]
                : [`Pillar 0${idx + 1}`, bp];
              const icons = [Target, Zap, Award, CheckCircle2];
              const IconComp = icons[idx % icons.length];
              return (
                <div
                  key={idx}
                  className="p-4 sm:p-5 rounded-2xl border flex flex-col justify-between shadow-md"
                  style={{
                    backgroundColor: theme.cardBg,
                    borderColor: theme.cardBorder,
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${theme.primary}25`, color: theme.primary }}
                    >
                      <IconComp className="w-4 h-4" />
                    </div>
                    <h4 className="text-sm sm:text-base font-bold" style={{ color: theme.textPrimary }}>
                      {parts[0]}
                    </h4>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed" style={{ color: theme.textSecondary }}>
                    {parts[1]}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* 3. 3-Columns (three_columns) */}
        {slide.layout === 'three_columns' && (
          <div className="grid grid-cols-3 gap-4 sm:gap-6 w-full">
            {(slide.content.bulletPoints || []).slice(0, 3).map((bp, idx) => {
              const parts = bp.includes(':')
                ? [bp.split(':')[0], bp.split(':').slice(1).join(':').trim()]
                : [`Pillar 0${idx + 1}`, bp];
              const icons = [Zap, Award, Target];
              const IconComp = icons[idx % icons.length];
              return (
                <div
                  key={idx}
                  className="p-5 rounded-2xl border flex flex-col justify-between shadow-md relative overflow-hidden"
                  style={{
                    backgroundColor: theme.cardBg,
                    borderColor: theme.cardBorder,
                  }}
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-1.5"
                    style={{ backgroundColor: theme.primary }}
                  />
                  <div>
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mb-3 mt-1"
                      style={{ backgroundColor: `${theme.primary}25`, color: theme.primary }}
                    >
                      <IconComp className="w-4 h-4" />
                    </div>
                    <h4 className="text-sm sm:text-base font-bold mb-1.5" style={{ color: theme.textPrimary }}>
                      {parts[0]}
                    </h4>
                    <p className="text-xs sm:text-sm leading-relaxed" style={{ color: theme.textSecondary }}>
                      {parts[1]}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 4. Split with Stat */}
        {slide.layout === 'split_with_stat' && (
          <div className="grid grid-cols-12 gap-6 sm:gap-8 items-center">
            <div className="col-span-7 space-y-3.5">
              {(slide.content.bulletPoints || []).map((bp, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold"
                    style={{ backgroundColor: `${theme.primary}25`, color: theme.primary }}
                  >
                    ✓
                  </div>
                  <p className="text-sm sm:text-base font-medium leading-relaxed">
                    {bp}
                  </p>
                </div>
              ))}
            </div>

            {slide.content.statistic && (
              <div
                className="col-span-5 p-6 sm:p-8 rounded-3xl border text-center shadow-lg"
                style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
              >
                <span
                  className="text-4xl sm:text-6xl font-black block"
                  style={{ color: theme.primary }}
                >
                  {slide.content.statistic.number}
                </span>
                <span className="text-sm sm:text-base font-bold block mt-2">
                  {slide.content.statistic.label}
                </span>
                {slide.content.statistic.context && (
                  <span className="text-xs mt-2 block opacity-80" style={{ color: theme.textSecondary }}>
                    {slide.content.statistic.context}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* 5. Metrics Grid */}
        {slide.layout === 'metrics_grid' && (
          <div className="grid grid-cols-3 gap-4 sm:gap-6">
            {(slide.content.metrics || []).map((m, idx) => (
              <div
                key={idx}
                className="p-5 sm:p-6 rounded-3xl border shadow-md flex flex-col justify-between"
                style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
              >
                <span className="text-3xl sm:text-4xl font-black block mb-1.5" style={{ color: theme.textPrimary }}>
                  {m.value}
                </span>
                <span className="text-xs sm:text-sm font-bold block" style={{ color: theme.accent }}>
                  {m.label}
                </span>
                {m.change && (
                  <span className="text-xs font-bold mt-2 text-emerald-400 block">
                    {m.change}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 6. Comparison Table */}
        {slide.layout === 'comparison_table' && (
          <div
            className="rounded-xl border overflow-hidden shadow-md"
            style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
          >
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr style={{ backgroundColor: `${theme.primary}20` }}>
                  <th className="p-3 font-bold" style={{ color: theme.textPrimary }}>
                    Capabilities & Architecture
                  </th>
                  <th className="p-3 font-extrabold text-center" style={{ color: theme.accent }}>
                    Our Solution
                  </th>
                  <th className="p-3 font-semibold text-center" style={{ color: theme.textSecondary }}>
                    {slide.content.competitorNames?.[0] || 'Alternative'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: theme.cardBorder }}>
                {(slide.content.comparisonRows || []).map((row, idx) => (
                  <tr key={idx}>
                    <td className="p-3 font-medium" style={{ color: theme.textPrimary }}>
                      {row.feature}
                    </td>
                    <td className="p-3 text-center font-bold" style={{ color: theme.accent }}>
                      {row.us === true ? (
                        <CheckCircle2 className="w-4 h-4 mx-auto text-emerald-400" />
                      ) : (
                        String(row.us)
                      )}
                    </td>
                    <td className="p-3 text-center font-medium" style={{ color: theme.textSecondary }}>
                      {row.competitors === false ? (
                        <XCircle className="w-4 h-4 mx-auto text-rose-400/80" />
                      ) : (
                        String(row.competitors)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 7. Process Steps */}
        {slide.layout === 'process_steps' && (
          <div className="grid grid-cols-3 gap-4">
            {(slide.content.processSteps || []).map((step, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl border shadow-md flex flex-col justify-between relative"
                style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-white mb-2"
                  style={{ backgroundColor: theme.primary }}
                >
                  0{step.number || idx + 1}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold mb-1" style={{ color: theme.textPrimary }}>
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm leading-relaxed" style={{ color: theme.textSecondary }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 8. SWOT Grid */}
        {slide.layout === 'swot_grid' && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {[
              { title: 'STRENGTHS', items: slide.content.swot?.strengths || [], color: theme.accent },
              { title: 'WEAKNESSES', items: slide.content.swot?.weaknesses || [], color: theme.textSecondary },
              { title: 'OPPORTUNITIES', items: slide.content.swot?.opportunities || [], color: theme.primary },
              { title: 'THREATS', items: slide.content.swot?.threats || [], color: theme.textSecondary },
            ].map((quad, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border"
                style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
              >
                <span className="text-xs font-black tracking-wider block mb-1.5" style={{ color: quad.color }}>
                  {quad.title}
                </span>
                <ul className="space-y-1 text-xs sm:text-sm" style={{ color: theme.textPrimary }}>
                  {quad.items.map((it, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-indigo-400">•</span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* 9. Pricing Table */}
        {slide.layout === 'pricing_table' && (
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {(slide.content.pricingTiers || []).map((tier, idx) => (
              <div
                key={idx}
                className="p-4 sm:p-5 rounded-2xl border shadow-md flex flex-col justify-between relative"
                style={{
                  backgroundColor: theme.cardBg,
                  borderColor: tier.isPopular ? theme.accent : theme.cardBorder,
                }}
              >
                {tier.isPopular && (
                  <span
                    className="absolute -top-2.5 right-4 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: theme.primary }}
                  >
                    POPULAR
                  </span>
                )}
                <div>
                  <h4 className="font-bold text-xs sm:text-sm" style={{ color: theme.textPrimary }}>
                    {tier.name}
                  </h4>
                  <div className="flex items-baseline gap-1 my-2">
                    <span className="text-xl sm:text-2xl font-black" style={{ color: theme.primary }}>
                      {tier.price}
                    </span>
                    <span className="text-[11px] opacity-70" style={{ color: theme.textSecondary }}>
                      {tier.period || '/mo'}
                    </span>
                  </div>
                  <ul className="space-y-1 text-xs" style={{ color: theme.textPrimary }}>
                    {tier.features.map((f, fi) => (
                      <li key={fi} className="flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 10. Team Cards */}
        {slide.layout === 'team_cards' && (
          <div className="grid grid-cols-3 gap-4">
            {(slide.content.teamMembers || []).map((member, idx) => (
              <div
                key={idx}
                className="p-4 sm:p-5 rounded-2xl border text-center flex flex-col items-center justify-center shadow-md"
                style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm text-white mb-2 shadow-sm"
                  style={{ backgroundColor: theme.primary }}
                >
                  {member.avatarInitials || member.name.substring(0, 2).toUpperCase()}
                </div>
                <h4 className="text-sm font-bold" style={{ color: theme.textPrimary }}>
                  {member.name}
                </h4>
                <span className="text-xs font-semibold mb-1" style={{ color: theme.accent }}>
                  {member.role}
                </span>
                <p className="text-xs line-clamp-3 leading-relaxed" style={{ color: theme.textSecondary }}>
                  {member.bio}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* 11. Full Bleed Statement */}
        {slide.layout === 'full_bleed_statement' && (
          <div className="space-y-4 max-w-3xl mx-auto">
            {slide.content.ctaAction?.askAmount && (
              <div
                className="p-6 sm:p-8 rounded-3xl border text-center shadow-xl"
                style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
              >
                <span className="text-xs sm:text-sm font-bold tracking-widest uppercase block" style={{ color: theme.accent }}>
                  TARGET FUNDRAISING OBJECTIVE
                </span>
                <span className="text-3xl sm:text-5xl font-black block mt-2" style={{ color: theme.textPrimary }}>
                  {slide.content.ctaAction.askAmount}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 12. Fallback Bullet Points */}
        {slide.layout !== 'centered_hero' &&
          slide.layout !== 'quad_grid' &&
          slide.layout !== 'three_columns' &&
          slide.layout !== 'split_with_stat' &&
          slide.layout !== 'metrics_grid' &&
          slide.layout !== 'comparison_table' &&
          slide.layout !== 'process_steps' &&
          slide.layout !== 'swot_grid' &&
          slide.layout !== 'pricing_table' &&
          slide.layout !== 'team_cards' &&
          slide.layout !== 'full_bleed_statement' && (
            <div className="space-y-3.5 max-w-3xl">
              {(slide.content.bulletPoints || []).map((bp, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3.5 p-3.5 rounded-2xl"
                  style={{ backgroundColor: `${theme.cardBg}80` }}
                >
                  <span className="text-lg font-bold" style={{ color: theme.primary }}>
                    •
                  </span>
                  <p className="text-sm sm:text-base md:text-lg font-medium leading-relaxed">
                    {bp}
                  </p>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* Footer Branding & Slide Number */}
      <div
        className="pt-3 border-t flex items-center justify-between text-xs opacity-75 relative z-10 shrink-0"
        style={{ borderColor: `${theme.textSecondary}25`, color: theme.textSecondary }}
      >
        <div className="flex items-center gap-2 truncate max-w-[70%]">
          <span>Trusity AI • {deckTitle}</span>
          {visualAsset?.caption && (
            <span className="text-[11px] opacity-80 truncate border-l pl-2 border-current">
              {visualAsset.caption}
            </span>
          )}
        </div>
        <span>
          {slideIndex + 1} / {totalSlides}
        </span>
      </div>
    </div>
  );
};
