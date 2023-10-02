const getLocalTime = (date) => {
  if (date) {
    const eventDate = new Date(date);
    const userTimeZoneOffsetInMinutes = new Date().getTimezoneOffset();
    const eventDateInLocalTimezone = new Date(
      eventDate.getTime() - userTimeZoneOffsetInMinutes * 60000
    );
    return eventDateInLocalTimezone;
  }
  return null;
};

const getLocalISOtime = (date) => {
  if (date) {
    const eventDate = new Date(date);
    const userTimeZoneOffsetInMinutes = new Date().getTimezoneOffset();
    const eventDateInLocalTimezone = new Date(
      eventDate.getTime() - userTimeZoneOffsetInMinutes * 60000
    )
      .toISOString()
      .slice(0, 16);
    return eventDateInLocalTimezone;
  }
  return getToday();
};

const getCronExpression = (date) => {
  if (date) {
    const minutes = date.getUTCMinutes();
    const hours = date.getUTCHours();
    const dayOfMonth = date.getUTCDate();
    const month = date.getUTCMonth() + 1;
    const dayOfWeek = date.getUTCDay();

    return `${minutes} ${hours} ${dayOfMonth} ${month} ${dayOfWeek}`;
  }
  return null;
};

module.exports = {
  getLocalTime,
  getCronExpression,
  getLocalISOtime
};
