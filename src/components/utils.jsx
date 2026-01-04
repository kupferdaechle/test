// Hilfsfunktionen für die gesamte App

export const createPageUrl = (pageName) => {
  return `/${pageName}`;
};

export const formatCurrency = (amount, showCurrency = true, decimals = 0) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return showCurrency ? '0 €' : '0';
  }
  
  const formatted = amount.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  
  return showCurrency ? `${formatted} €` : formatted;
};