const guestCountIndex = allValues.findIndex((v) => Number(v) === guest_count);
const phoneIndex = allValues.findIndex((v) => looksLikePhone(v));

const guestNameAnswers =
  guestCountIndex >= 0 && phoneIndex > guestCountIndex
    ? allValues
        .slice(guestCountIndex + 1, phoneIndex)
        .filter((value) => {
          const normalized = normalizeText(value);
          return (
            value &&
            value !== fullName &&
            value !== phone &&
            value !== travelFrom &&
            value !== attending &&
            value !== guestCountRaw &&
            !looksLikePhone(value) &&
            !normalized.includes("todo se ve bien")
          );
        })
    : [];

const additional_guests = guestNameAnswers.join("\n");

const confirmed_guests = [fullName, ...guestNameAnswers]
  .filter(Boolean)
  .join("\n");
