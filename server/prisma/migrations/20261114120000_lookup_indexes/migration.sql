-- Indexes for the columns the API filters by (course session 22:
-- "index what you filter and sort by"). Only adds indexes; no data changes.
-- CreateIndex
CREATE INDEX "Service_businessId_idx" ON "Service"("businessId");

-- CreateIndex
CREATE INDEX "Staff_businessId_idx" ON "Staff"("businessId");

-- CreateIndex
CREATE INDEX "StaffService_serviceId_idx" ON "StaffService"("serviceId");

-- CreateIndex
CREATE INDEX "WorkingHours_businessId_weekday_idx" ON "WorkingHours"("businessId", "weekday");

-- CreateIndex
CREATE INDEX "WorkingHours_staffId_weekday_idx" ON "WorkingHours"("staffId", "weekday");

-- CreateIndex
CREATE INDEX "Break_businessId_weekday_idx" ON "Break"("businessId", "weekday");

-- CreateIndex
CREATE INDEX "Break_staffId_weekday_idx" ON "Break"("staffId", "weekday");

-- CreateIndex
CREATE INDEX "Appointment_staffId_startAt_idx" ON "Appointment"("staffId", "startAt");

