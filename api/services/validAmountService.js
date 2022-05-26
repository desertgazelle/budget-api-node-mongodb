module.exports = function () {
  function isValid(validAmount, history, lastMonth, update = false) {
    if (validAmount) {
      let originalValidAmount = null;

      if (history.length > 0) {
        originalValidAmount = history.find((s) => s.id == validAmount.id);
        let filteredHistory = update
          ? history.filter((s) => s.id != validAmount.id)
          : history;
        filteredHistory = filteredHistory.sort((a, b) =>
          a.startDate > b.startDate ? -1 : b.startDate > a.startDate ? 1 : 0
        );

        if (filteredHistory.length > 0) {
          const firstValidAmount = filteredHistory[filteredHistory.length - 1];
          const lastValidAmount = filteredHistory[0];

          if (
            firstValidAmount &&
            validAmount.startDate <= firstValidAmount.startDate
          ) {
            return "La date de début de validité est plus petite que la date de début de début de l'historique !";
          }

          if (
            (firstValidAmount &&
              validAmount.startDate <= firstValidAmount.startDate) ||
            (lastValidAmount &&
              (validAmount.startDate < lastValidAmount.startDate ||
                (lastValidAmount.endDate &&
                  validAmount.startDate < lastValidAmount.endDate)))
          ) {
            return "L'intervalle de validité de ce montant chevauche celui de l'historique !";
          }
        }
      }

      const canEditStartDate =
        !update || originalValidAmount.startDate > lastMonth;

      if (
        !canEditStartDate &&
        originalValidAmount.amount != validAmount.amount
      ) {
        return "La valeur du montant ne peut être modifiée sans affecter l'historique du budget !";
      }

      const canEditEndDate =
        !update ||
        !originalValidAmount.endDate ||
        originalValidAmount.endDate > lastMonth;

      let isBudgetHistoryAffected =
        !update && validAmount.startDate <= lastMonth;

      isBudgetHistoryAffected =
        isBudgetHistoryAffected ||
        (!canEditStartDate &&
          originalValidAmount.startDate.getDate() !=
            validAmount.startDate.getDate()) ||
        (!canEditEndDate &&
          originalValidAmount.endDate.getDate() !=
            validAmount.endDate.getDate());
      isBudgetHistoryAffected =
        isBudgetHistoryAffected ||
        (canEditStartDate && validAmount.startDate <= lastMonth) ||
        (canEditEndDate &&
          validAmount.endDate &&
          validAmount.endDate < lastMonth);

      if (isBudgetHistoryAffected) {
        return "L'intervalle de validité de ce montant affecte l'historique du budget !";
      }
    }
    return "";
  }

  return { isValid };
};
