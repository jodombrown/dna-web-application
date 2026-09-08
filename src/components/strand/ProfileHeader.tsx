// Ported from profile/strand-patch/Profile.jsx (B3-Profile-v3, rulings 122, 127, 130, 131, 134,
// 136). Behavior unchanged. One masthead for every view: `hero` is the locked, condensing banner;
// `hero && split` the expanded public split banner; neither is the in-column card form. The ground
// carries the member's textile tile (ruling 132), the one place a pattern sits behind a page head.
// Mate masie appears nowhere on the profile (ruling 133).
import type { CSSProperties, ReactNode } from "react";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";
import { IdentityMark } from "./IdentityMark";
import { assetBase } from "./cmeta";

export type MastheadPattern = "kente" | "adinkra" | "mudcloth";

export type ProfileHeaderMember = {
  name: string;
  headline?: string | null | undefined;
  avatar?: string | null | undefined;
  cover?: string | null | undefined;
  coverFocus?: string | null | undefined;
  originCountry?: string | null | undefined;
  currentPlace?: string | null | undefined;
  pattern?: MastheadPattern | null | undefined;
};

export type ProfileHeaderProps = {
  member: ProfileHeaderMember;
  identified?: boolean | undefined;
  segmentLabel?: string | null | undefined;
  actions?: ReactNode;
  onAvatar?: (() => void) | undefined;
  onCover?: (() => void) | undefined;
  owner?: boolean | undefined;
  hero?: boolean | undefined;
  split?: boolean | undefined;
  condensed?: boolean | undefined;
  lock?: boolean | undefined;
  condensedAvatar?: number;
  bleed?: number;
  gutter?: number | undefined;
  timeLine?: string | null | undefined;
  coverHeight?: number;
  avatarSize?: number;
  children?: ReactNode;
  style?: CSSProperties | undefined;
};

const ONE: CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

export function ProfileHeader({
  member,
  identified,
  segmentLabel,
  actions,
  onAvatar,
  onCover,
  owner,
  hero,
  split,
  condensed,
  lock = true,
  condensedAvatar = 64,
  bleed = 0,
  gutter,
  timeLine,
  coverHeight = 220,
  avatarSize = 112,
  children,
  style,
}: ProfileHeaderProps) {
  const origin = member.originCountry ? "From " + member.originCountry : null;
  const base = assetBase();
  const overlap = Math.round(avatarSize * (hero ? 0.5 : 0.55));
  const tile = base + "patterns/" + (member.pattern || "kente") + "-pattern.svg";
  const gut = gutter != null ? gutter : Math.max(16, bleed);
  const stick: CSSProperties = lock
    ? { position: "sticky", top: 0, zIndex: 3 }
    : { position: "relative" };
  const coverTools = owner && (
    <>
      {!member.cover && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={onCover}
            style={{ background: "var(--surface)" }}
            data-testid="add-cover"
          >
            <Icon name="image" size={16} />
            Add a cover
          </Button>
        </div>
      )}
      {member.cover && (
        <IconButton
          name="camera"
          label="Change cover"
          size={36}
          onClick={onCover}
          style={{
            position: "absolute",
            right: 12,
            top: 12,
            background: "var(--surface)",
            borderRadius: 10,
          }}
        />
      )}
    </>
  );
  const plate = (size: number, pad: number, r: number) => (
    <button
      type="button"
      onClick={onAvatar}
      aria-label={owner ? "Change your photo" : member.name}
      disabled={!owner}
      data-testid="portrait"
      style={{
        appearance: "none",
        border: 0,
        margin: 0,
        font: "inherit",
        position: "relative",
        display: "inline-flex",
        flex: "none",
        padding: pad,
        borderRadius: r,
        background: "var(--surface)",
        cursor: owner ? "pointer" : "default",
      }}
    >
      <Avatar
        name={member.name}
        src={member.avatar ?? undefined}
        size={size}
        style={{ borderRadius: r - pad }}
      />
      {identified && (
        <IdentityMark
          size={size >= 100 ? 24 : 18}
          style={{ position: "absolute", right: -4, bottom: -4 }}
        />
      )}
      {owner && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: -6,
            bottom: -6,
            width: 28,
            height: 28,
            borderRadius: 999,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ink-2)",
          }}
        >
          <Icon name="camera" size={13} />
        </span>
      )}
    </button>
  );
  const condensedRowFn = () => (
    <div
      data-testid="masthead-condensed"
      style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px " + gut + "px" }}
    >
      {plate(condensedAvatar, 4, 18)}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 24, lineHeight: 1.1, ...ONE }}>
          {member.name}
        </span>
        {member.headline && (
          <span style={{ fontSize: 15, color: "var(--ink-2)", lineHeight: 1.3, ...ONE }}>
            {member.headline}
          </span>
        )}
        {(origin || member.currentPlace) && (
          <span
            style={{
              fontSize: 13,
              color: "var(--ink-3)",
              lineHeight: 1.3,
              display: "flex",
              alignItems: "center",
              gap: 5,
              ...ONE,
            }}
          >
            <Icon name="map-pin" size={12} />
            {[origin, member.currentPlace].filter(Boolean).join(" · ")}
          </span>
        )}
        {timeLine && (
          <span
            style={{
              fontSize: 13,
              color: "var(--ink-3)",
              lineHeight: 1.3,
              display: "flex",
              alignItems: "center",
              gap: 5,
              ...ONE,
            }}
          >
            <Icon name="clock" size={12} />
            {timeLine}
          </span>
        )}
      </div>
    </div>
  );
  const meta = (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "4px 14px",
        fontSize: 15,
        color: "var(--ink-3)",
        lineHeight: 1.4,
      }}
    >
      {segmentLabel && (
        <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>{segmentLabel}</span>
      )}
      {origin && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <Icon name="globe" size={14} />
          {origin}
        </span>
      )}
      {member.currentPlace && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <Icon name="map-pin" size={14} />
          {member.currentPlace}
        </span>
      )}
    </div>
  );
  const time = timeLine && (
    <div
      data-testid="local-time"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 13,
        color: "var(--ink-3)",
      }}
    >
      <Icon name="clock" size={13} />
      {timeLine}
    </div>
  );
  const slot = (actions || children) && (
    <div style={{ padding: "8px 16px 0" }}>{actions || children}</div>
  );

  if (hero && split) {
    // Expanded public: one locked banner, split. Identity panel at left, cover photo at right. No text over the image, nothing overlaps.
    if (condensed)
      return (
        <header
          aria-label="Member"
          data-testid="masthead"
          data-condensed="1"
          style={{ display: "contents" }}
        >
          <div
            style={{
              ...stick,
              margin: "0 -" + bleed + "px",
              background: "var(--bg-sunken) url(" + tile + ")",
              borderBottom: "1px solid var(--line)",
              fontFamily: "var(--font-sans)",
              color: "var(--ink)",
            }}
          >
            {condensedRowFn()}
          </div>
          {slot}
        </header>
      );
    return (
      <header
        aria-label="Member"
        data-testid="masthead"
        data-condensed="0"
        style={{ display: "contents" }}
      >
        <div
          style={{
            ...stick,
            height: coverHeight,
            margin: "0 -" + bleed + "px",
            display: "grid",
            gridTemplateColumns: "520px minmax(0,1fr)",
            overflow: "hidden",
            background: "var(--bg-sunken) url(" + tile + ")",
            borderBottom: "1px solid var(--line)",
            fontFamily: "var(--font-sans)",
            color: "var(--ink)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              gap: 12,
              padding: "20px 32px 28px " + Math.max(32, gut) + "px",
              minWidth: 0,
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", gap: 20, alignItems: "flex-end", minWidth: 0 }}>
              {plate(avatarSize, 6, 24)}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
                <h1
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-display)",
                    fontWeight: 400,
                    fontSize: 44,
                    lineHeight: 1.02,
                    letterSpacing: "-0.01em",
                    textWrap: "balance",
                    overflowWrap: "anywhere",
                  }}
                >
                  {member.name}
                </h1>
                {member.headline && (
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontStyle: "italic",
                      fontSize: 20,
                      lineHeight: 1.3,
                      color: "var(--ink-2)",
                      textWrap: "pretty",
                    }}
                  >
                    {member.headline}
                  </div>
                )}
                <span
                  aria-hidden="true"
                  style={{ width: 48, height: 1, background: "var(--ink-3)", margin: "4px 0 2px" }}
                />
                {meta}
                {time}
              </div>
            </div>
          </div>
          <div
            data-testid="cover"
            style={{
              position: "relative",
              overflow: "hidden",
              background: member.cover ? "var(--bg-sunken)" : "var(--bg-sunken) url(" + tile + ")",
            }}
          >
            {member.cover && (
              <img
                src={member.cover}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: member.coverFocus || "center 35%",
                  display: "block",
                }}
              />
            )}
            {coverTools}
          </div>
        </div>
        {slot}
      </header>
    );
  }

  const avatarBtn = (
    <button
      type="button"
      onClick={onAvatar}
      aria-label={owner ? "Change your photo" : member.name}
      disabled={!owner}
      data-testid="portrait"
      style={{
        all: "unset",
        position: "relative",
        cursor: owner ? "pointer" : "default",
        flex: "none",
        borderRadius: 18,
        boxShadow: hero ? "none" : "0 0 0 4px var(--bg)",
        background: "var(--bg)",
      }}
    >
      <Avatar
        name={member.name}
        src={member.avatar ?? undefined}
        size={avatarSize}
        style={{ borderRadius: 18 }}
      />
      {identified && (
        <IdentityMark size={24} style={{ position: "absolute", right: -6, bottom: -6 }} />
      )}
      {owner && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: -6,
            bottom: -6,
            width: 30,
            height: 30,
            borderRadius: 999,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ink-2)",
          }}
        >
          <Icon name="camera" size={14} />
        </span>
      )}
    </button>
  );

  return (
    <header
      aria-label="Member"
      data-testid="masthead"
      data-condensed={hero && condensed ? "1" : "0"}
      style={
        hero
          ? { display: "contents" }
          : {
              display: "flex",
              flexDirection: "column",
              gap: 16,
              fontFamily: "var(--font-sans)",
              color: "var(--ink)",
              ...style,
            }
      }
    >
      {hero && (
        <div
          style={{
            ...stick,
            margin: "0 -" + bleed + "px",
            display: "flex",
            flexDirection: "column",
            background: "var(--bg-sunken) url(" + tile + ")",
            borderBottom: "1px solid var(--line)",
            fontFamily: "var(--font-sans)",
            color: "var(--ink)",
          }}
        >
          <div
            data-testid="cover"
            style={{
              position: "relative",
              height: condensed ? 0 : coverHeight,
              overflow: "hidden",
              background: member.cover ? "var(--bg-sunken)" : "var(--bg-sunken) url(" + tile + ")",
              transition: "height var(--dur-base) var(--ease)",
            }}
          >
            {member.cover && (
              <img
                src={member.cover}
                alt=""
                style={{
                  width: "100%",
                  height: coverHeight,
                  objectFit: "cover",
                  objectPosition: member.coverFocus || "center 35%",
                  display: "block",
                }}
              />
            )}
            {!condensed && coverTools}
          </div>
          {condensed ? (
            condensedRowFn()
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: "0 " + gut + "px 16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 14,
                  marginTop: -overlap - 6,
                }}
              >
                {plate(avatarSize, 6, 24)}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    minWidth: 0,
                    paddingBottom: 2,
                  }}
                >
                  {member.headline && (
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontStyle: "italic",
                        fontSize: 17,
                        lineHeight: 1.3,
                        color: "var(--ink-2)",
                        textWrap: "pretty",
                      }}
                    >
                      {member.headline}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                <h1
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-display)",
                    fontWeight: 400,
                    fontSize: 34,
                    lineHeight: 1.02,
                    letterSpacing: "-0.01em",
                    textWrap: "balance",
                    overflowWrap: "anywhere",
                  }}
                >
                  {member.name}
                </h1>
                {meta}
                {time}
              </div>
            </div>
          )}
        </div>
      )}
      {!hero && (
        <div
          data-testid="cover"
          style={{
            position: "relative",
            height: coverHeight,
            borderRadius: 14,
            overflow: "hidden",
            background: member.cover
              ? "var(--bg-sunken)"
              : "var(--bg-sunken) url(" + base + "patterns/kente-pattern.svg)",
            border: member.cover ? "none" : "1px solid var(--line)",
            boxSizing: "border-box",
          }}
        >
          {member.cover && (
            <img
              src={member.cover}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: member.coverFocus || "center 35%",
                display: "block",
              }}
            />
          )}
          {owner && !member.cover && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
              }}
            >
              <Button
                variant="secondary"
                size="sm"
                onClick={onCover}
                style={{ background: "var(--surface)" }}
              >
                <Icon name="image" size={16} />
                Add a cover
              </Button>
            </div>
          )}
          {owner && member.cover && (
            <IconButton
              name="camera"
              label="Change cover"
              size={36}
              onClick={onCover}
              style={{
                position: "absolute",
                right: 8,
                top: 8,
                background: "var(--surface)",
                borderRadius: 10,
              }}
            />
          )}
        </div>
      )}
      {!hero && (
        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "flex-end",
            marginTop: -overlap - 16,
            padding: "0 16px",
          }}
        >
          {avatarBtn}
        </div>
      )}
      {!hero && (
        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "flex-start",
            padding: "0 16px",
            fontFamily: "var(--font-sans)",
            color: "var(--ink)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, flex: 1 }}>
            <h1
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontWeight: 400,
                fontSize: 36,
                lineHeight: 1.1,
                textWrap: "balance",
                overflowWrap: "anywhere",
              }}
            >
              {member.name}
            </h1>
            {member.headline && (
              <div
                style={{ fontSize: 17, lineHeight: 1.4, color: "var(--ink-2)", textWrap: "pretty" }}
              >
                {member.headline}
              </div>
            )}
            {meta}
            {time}
          </div>
        </div>
      )}
      {hero ? slot : <div style={{ padding: "0 16px" }}>{actions || children}</div>}
    </header>
  );
}
